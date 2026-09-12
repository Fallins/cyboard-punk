#!/usr/bin/env python3
from pathlib import Path
from playwright.sync_api import sync_playwright

OUT = Path('stage7-browser-artifacts') / 'webkit'
OUT.mkdir(parents=True, exist_ok=True)


def mark(message: str) -> None:
    print(f'[webkit-sanity] {message}', flush=True)
    with (OUT / 'sanity-progress.log').open('a', encoding='utf-8') as handle:
        handle.write(message + '\n')
        handle.flush()


mark('start')
with sync_playwright() as playwright:
    mark('before launch')
    browser = playwright.webkit.launch(headless=True)
    mark('after launch')
    context = browser.new_context(viewport={'width': 320, 'height': 240}, device_scale_factor=1)
    mark('after context')
    page = context.new_page()
    mark('after new page')
    page.set_content('<!doctype html><html><body><main id="probe">webkit-ok</main></body></html>', wait_until='domcontentloaded', timeout=5_000)
    mark('after set content')
    text = page.locator('#probe').inner_text(timeout=5_000)
    assert text == 'webkit-ok', text
    mark('after text assertion')
    page.screenshot(path=str(OUT / 'webkit-sanity.png'), timeout=5_000)
    mark('after screenshot')
    context.close()
    mark('after context close')
    browser.close()
    mark('after browser close')

mark('PASS')
