#!/usr/bin/env python3
import json
import math
import sys
from pathlib import Path

from PIL import Image, ImageChops
from playwright.sync_api import sync_playwright

BASE_URL = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:4173'
OUT = Path('stage7-browser-artifacts')
OUT.mkdir(parents=True, exist_ok=True)

metrics = {'baseUrl': BASE_URL, 'cases': {}, 'errors': []}


def numeric(dataset, key):
    value = dataset.get(key)
    if value is None:
        raise AssertionError(f'missing dataset value: {key}')
    return float(value)


def open_page(browser, query):
    page = browser.new_page(viewport={'width': 302, 'height': 648}, device_scale_factor=1)
    # Headless Chromium can throttle requestAnimationFrame heavily enough that
    # wall-clock waits no longer exercise the frozen Stage 6 timing contract.
    # Replace only the CI scheduler with a 16 ms timer before application code
    # loads; production/runtime timing values remain unchanged.
    page.add_init_script(
        """
        (() => {
          const scheduled = new Map();
          let nextId = 1;
          window.requestAnimationFrame = (callback) => {
            const id = nextId++;
            const timer = window.setTimeout(() => {
              scheduled.delete(id);
              callback(performance.now());
            }, 16);
            scheduled.set(id, timer);
            return id;
          };
          window.cancelAnimationFrame = (id) => {
            const timer = scheduled.get(id);
            if (timer !== undefined) {
              window.clearTimeout(timer);
              scheduled.delete(id);
            }
          };
        })();
        """
    )
    page_errors = []
    page.on('pageerror', lambda error: page_errors.append(f'pageerror: {error}'))
    page.on(
        'console',
        lambda message: page_errors.append(f'console.error: {message.text}') if message.type == 'error' else None,
    )
    page.goto(f'{BASE_URL}/stage7-runtime.html?{query}', wait_until='networkidle')
    return page, page_errors


def stage_dataset(page):
    return page.locator('.stage7-capture-stage').evaluate(
        '(element) => Object.fromEntries(Object.entries(element.dataset))'
    )


def runtime_dataset(page):
    return page.locator('.nyx-stage7-experimental').evaluate(
        '(element) => Object.fromEntries(Object.entries(element.dataset))'
    )


def screenshot(page, name):
    path = OUT / f'{name}.png'
    page.locator('.stage7-capture-stage').screenshot(path=str(path))
    return path


def compare_images(reference_path, candidate_path):
    reference = Image.open(reference_path).convert('RGB')
    candidate = Image.open(candidate_path).convert('RGB')
    if reference.size != candidate.size:
        raise AssertionError(f'image size mismatch: {reference.size} != {candidate.size}')
    diff = ImageChops.difference(reference, candidate)
    changed = 0
    max_delta = 0
    total_delta = 0
    for pixel in diff.getdata():
        delta = max(pixel)
        max_delta = max(max_delta, delta)
        total_delta += sum(pixel)
        if delta > 8:
            changed += 1
    total_pixels = reference.width * reference.height
    return {
        'changedPixelsOver8': changed,
        'changedRatioOver8': changed / total_pixels,
        'maxChannelDelta': max_delta,
        'meanChannelDelta': total_delta / (total_pixels * 3),
    }


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)

    reference, errors = open_page(browser, 'reference=1')
    reference_path = screenshot(reference, 'reference-neutral')
    metrics['errors'].extend(errors)
    reference.close()

    neutral, errors = open_page(browser, 'state=idle&attention=center&reduced=1')
    neutral.wait_for_selector('.nyx-stage7-experimental')
    neutral.wait_for_timeout(250)
    neutral_stage = stage_dataset(neutral)
    neutral_runtime = runtime_dataset(neutral)
    assert neutral_stage.get('nyxRendererTier') == 'stage7-experimental', neutral_stage
    assert neutral_stage.get('nyx2dLifecycle') == 'static', neutral_stage
    assert neutral_runtime.get('ack') == 'idle', neutral_runtime
    assert abs(numeric(neutral_runtime, 'neckDeg')) < 0.001, neutral_runtime
    assert abs(numeric(neutral_runtime, 'torsoDeg')) < 0.001, neutral_runtime
    neutral_path = screenshot(neutral, 'runtime-neutral-reduced')
    neutral_diff = compare_images(reference_path, neutral_path)
    metrics['cases']['neutralReduced'] = {
        'stage': neutral_stage,
        'runtime': neutral_runtime,
        'pixelDiff': neutral_diff,
    }
    assert neutral_diff['changedRatioOver8'] < 0.03, neutral_diff
    metrics['errors'].extend(errors)
    neutral.close()

    processing, errors = open_page(browser, 'state=processing&attention=cursor')
    processing.wait_for_selector('.nyx-stage7-experimental')
    processing.wait_for_timeout(1250)
    processing_stage = stage_dataset(processing)
    processing_runtime = runtime_dataset(processing)
    assert processing_stage.get('nyx2dLifecycle') == 'animated', processing_stage
    assert processing_runtime.get('attentionTarget') == 'cursor', processing_runtime
    neck = numeric(processing_runtime, 'neckDeg')
    gaze = numeric(processing_runtime, 'gazePx')
    assert 0.5 < neck <= 2.2 + 0.02, processing_runtime
    assert 0 < gaze <= 1.0 + 0.02, processing_runtime
    screenshot(processing, 'runtime-processing-cursor')
    metrics['cases']['processingCursor'] = {
        'stage': processing_stage,
        'runtime': processing_runtime,
    }

    before_hidden = numeric(processing_runtime, 'neckDeg')
    processing.evaluate(
        "Object.defineProperty(document, 'hidden', {configurable: true, get: () => true});"
        "document.dispatchEvent(new Event('visibilitychange'));"
    )
    processing.wait_for_timeout(350)
    hidden_stage = stage_dataset(processing)
    hidden_runtime = runtime_dataset(processing)
    assert hidden_stage.get('nyx2dLifecycle') == 'suspended', hidden_stage
    assert math.isclose(numeric(hidden_runtime, 'neckDeg'), before_hidden, abs_tol=0.05), hidden_runtime
    screenshot(processing, 'runtime-hidden-paused')

    processing.evaluate(
        "Object.defineProperty(document, 'hidden', {configurable: true, get: () => false});"
        "document.dispatchEvent(new Event('visibilitychange'));"
    )
    processing.wait_for_timeout(20)
    resumed_stage = stage_dataset(processing)
    resumed_runtime = runtime_dataset(processing)
    assert resumed_stage.get('nyx2dLifecycle') == 'animated', resumed_stage
    assert abs(numeric(resumed_runtime, 'neckDeg') - before_hidden) < 0.20, resumed_runtime
    metrics['cases']['hiddenResume'] = {
        'hiddenStage': hidden_stage,
        'hiddenRuntime': hidden_runtime,
        'resumedStage': resumed_stage,
        'resumedRuntime': resumed_runtime,
    }
    metrics['errors'].extend(errors)
    processing.close()

    blink, errors = open_page(browser, 'state=idle&attention=center')
    blink.wait_for_selector('.nyx-stage7-experimental')
    blink.wait_for_function(
        "Number(document.querySelector('.nyx-stage7-experimental')?.dataset.blink ?? 0) > 0.70",
        timeout=8_000,
    )
    blink_runtime = runtime_dataset(blink)
    assert numeric(blink_runtime, 'blink') > 0.70, blink_runtime
    screenshot(blink, 'runtime-blink')
    metrics['cases']['blink'] = {'runtime': blink_runtime}
    metrics['errors'].extend(errors)
    blink.close()

    acknowledgement, errors = open_page(browser, 'state=idle&attention=center')
    acknowledgement.wait_for_selector('.nyx-stage7-experimental')
    acknowledgement.wait_for_timeout(200)
    acknowledgement.evaluate("window.__NYX_STAGE7_HARNESS__.setState('success')")
    acknowledgement.wait_for_function(
        "Number(document.querySelector('.nyx-stage7-experimental')?.dataset.neckDeg ?? 0) > 1.15",
        timeout=2_000,
    )
    ack_runtime = runtime_dataset(acknowledgement)
    assert ack_runtime.get('ack') == 'active', ack_runtime
    assert numeric(ack_runtime, 'neckDeg') > 1.15, ack_runtime
    screenshot(acknowledgement, 'runtime-acknowledgement-peak')
    acknowledgement.wait_for_function(
        "document.querySelector('.nyx-stage7-experimental')?.dataset.ack === 'idle'",
        timeout=2_500,
    )
    settled_runtime = runtime_dataset(acknowledgement)
    assert settled_runtime.get('ack') == 'idle', settled_runtime
    metrics['cases']['acknowledgement'] = {
        'peak': ack_runtime,
        'settled': settled_runtime,
    }
    metrics['errors'].extend(errors)
    acknowledgement.close()

    browser.close()

if metrics['errors']:
    raise AssertionError('Browser runtime emitted errors: ' + ' | '.join(metrics['errors']))

(OUT / 'metrics.json').write_text(json.dumps(metrics, indent=2), encoding='utf-8')
print(json.dumps(metrics, indent=2))
