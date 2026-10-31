#!/usr/bin/env python3
"""Render the client documentation's supported Markdown into a printable handbook."""
import html
import posixpath
import re
import sys
from pathlib import Path

DOCUMENTS = [
    'docs/01_PROJECT_GUIDE.md', 'docs/02_USER_GUIDE.md',
    'docs/03_TECHNICAL_OVERVIEW.md', 'docs/04_SETUP_AND_DEPLOYMENT.md',
    'docs/05_OPERATIONS_MANUAL.md', 'docs/06_STATUS_AND_DEVELOPMENT_PLAN.md',
    'docs/07_TESTING_AND_ACCEPTANCE.md', 'docs/08_API_REFERENCE.md',
    'docs/09_DATA_AND_SECURITY.md', 'docs/10_HANDOVER_CHECKLIST.md',
    'docs/11_DIAGRAMS_AND_WORKFLOWS.md', 'docs/12_DEVELOPMENT_HISTORY.md',
    'docs/DEPENDENCIES.md', 'docs/ASSET_NOTICES.md', 'CHANGELOG.md',
]

def section_id(path):
    return 'section-' + path.replace('/', '-').replace('.md', '').lower()

def inline(value, source):
    tokens = []
    def token(rendered):
        tokens.append(rendered)
        return f'\x00{len(tokens)-1}\x00'
    value = re.sub(r'`([^`]+)`', lambda match: token('<code>' + html.escape(match[1]) + '</code>'), value)
    def link(match):
        target = match[2]
        if not re.match(r'^[a-zA-Z]+:', target) and not target.startswith('#'):
            path = posixpath.normpath(posixpath.join(posixpath.dirname(source), target.split('#', 1)[0]))
            if path in DOCUMENTS:
                target = '#' + section_id(path)
            else:
                target = path + ('#' + target.split('#', 1)[1] if '#' in target else '')
        return token('<a href="' + html.escape(target, quote=True) + '">' + html.escape(match[1]) + '</a>')
    value = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', link, value)
    value = html.escape(value)
    value = re.sub(r'\*\*([^*]+)\*\*', r'<strong>\1</strong>', value)
    value = re.sub(r'\x00(\d+)\x00', lambda match: tokens[int(match[1])], value)
    return value

def render(text, source):
    lines = text.splitlines()
    result = []
    index = 0
    list_type = None
    def close_list():
        nonlocal list_type
        if list_type:
            result.append(f'</{list_type}>')
            list_type = None
    while index < len(lines):
        line = lines[index]
        if not line.strip():
            close_list(); index += 1; continue
        if line.startswith('```'):
            close_list()
            language = line[3:].strip()
            index += 1
            code = []
            while index < len(lines) and not lines[index].startswith('```'):
                code.append(lines[index]); index += 1
            if language == 'mermaid':
                raise ValueError('Use the matching exported SVG in the handbook: ' + source)
            else:
                result.append('<pre><code>' + html.escape('\n'.join(code)) + '</code></pre>')
            index += 1; continue
        image = re.fullmatch(r'!\[([^\]]*)\]\(([^)\s]+)\)', line)
        if image:
            close_list()
            target = posixpath.normpath(posixpath.join(posixpath.dirname(source), image[2]))
            label = html.escape(image[1], quote=True)
            href = html.escape(target, quote=True)
            result.append('<figure class="diagram"><div class="diagram-viewport" role="region" aria-label="' + label + '" tabindex="0"><a href="' + href + '" aria-label="Open full-size diagram: ' + label + '"><img src="' + href + '" alt="' + label + '"></a></div><figcaption>' + label + ' · Open the image at full size to zoom.</figcaption></figure>')
            index += 1; continue
        heading = re.match(r'^(#{1,6}) (.+)$', line)
        if heading:
            close_list()
            level = min(len(heading[1]) + 1, 6)
            result.append(f'<h{level}>' + inline(heading[2], source) + f'</h{level}>')
            index += 1; continue
        if line.startswith('|'):
            close_list()
            rows = []
            while index < len(lines) and lines[index].startswith('|'):
                cells = [cell.strip() for cell in lines[index].strip().strip('|').split('|')]
                if not all(re.fullmatch(r':?-+:?', cell.replace(' ', '')) for cell in cells):
                    rows.append(cells)
                index += 1
            result.append('<table><thead><tr>' + ''.join('<th>' + inline(cell, source) + '</th>' for cell in rows[0]) + '</tr></thead><tbody>')
            for row in rows[1:]:
                result.append('<tr>' + ''.join('<td>' + inline(cell, source) + '</td>' for cell in row) + '</tr>')
            result.append('</tbody></table>'); continue
        item = re.match(r'^(- |\d+\. )(.+)$', line)
        if item:
            kind = 'ul' if item[1] == '- ' else 'ol'
            if list_type != kind:
                close_list(); list_type = kind; result.append(f'<{kind}>')
            text_item = re.sub(r'^\[ \] ', '☐ ', item[2])
            result.append('<li>' + inline(text_item, source) + '</li>')
            index += 1; continue
        close_list()
        paragraph = [line]
        index += 1
        while index < len(lines) and lines[index].strip() and not re.match(r'^(#|!\[|\||```|- |\d+\. )', lines[index]):
            paragraph.append(lines[index]); index += 1
        result.append('<p>' + inline(' '.join(paragraph), source) + '</p>')
    close_list()
    return '\n'.join(result)

def main():
    root = Path(sys.argv[1]).resolve()
    toc = []
    articles = []
    for source in DOCUMENTS:
        text = (root / source).read_text()
        title = text.splitlines()[0].lstrip('# ')
        identifier = section_id(source)
        toc.append('<li><a href="#' + identifier + '">' + html.escape(title) + '</a></li>')
        articles.append('<article id="' + identifier + '">' + render(text, source) + '</article>')
    document = '''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>DentaBook — Client Handbook</title><style>
:root{--blue:#126f9c;--ink:#17374b;--line:#d9e7ef}*{box-sizing:border-box}body{margin:0;color:var(--ink);background:#eaf2f7;font:16px/1.65 Arial,sans-serif}main{max-width:1040px;margin:auto;background:#fff;padding:44px}a{color:var(--blue);text-underline-offset:3px}h1,h2,h3,h4{line-height:1.2;break-after:avoid}h1{font-size:44px;margin:24px 0}h2{font-size:30px;color:var(--blue);padding-bottom:12px;border-bottom:2px solid var(--line)}h3{font-size:21px;margin-top:28px}p,li,td{overflow-wrap:anywhere}li{margin:7px 0}article{margin-top:55px}.cover{border-top:8px solid var(--blue);padding:38px 0}.logo{width:230px;max-width:70%;height:auto}.eyebrow{font-size:13px;letter-spacing:.15em;text-transform:uppercase;color:var(--blue)}.subtitle{font-size:22px}.note{background:#eff7fb;border-left:4px solid var(--blue);padding:15px 20px}.toc{columns:2;column-gap:32px;padding-left:24px}.toc li{break-inside:avoid}.toc a{display:block;min-height:44px;min-width:44px;padding:8px 0}table{width:100%;border-collapse:collapse;font-size:14px;margin:20px 0}th,td{border:1px solid var(--line);padding:10px;text-align:left;vertical-align:top}th{background:#edf6fb;color:#174968}thead{display:table-header-group}tr{break-inside:avoid}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#f3f6f8;border:1px solid var(--line);padding:14px;font-size:12px}code{font-family:Consolas,monospace;font-size:.9em}.architecture{margin:24px 0;background:#eff7fb;padding:18px;border:1px solid var(--line)}.architecture>div{display:flex;gap:15px;margin:10px 0}.architecture b,.architecture span{flex:1;padding:10px;background:#fff;border:1px solid var(--line)}.diagram{margin:22px 0;break-inside:avoid}.diagram-viewport{max-width:100%;overflow-x:auto;border:1px solid var(--line);background:#fff;padding:12px}.diagram-viewport a{display:block;width:max-content;min-width:44px;margin:auto}.diagram img{display:block;width:auto;height:auto;max-width:none;max-height:1000px}.diagram-viewport:focus-visible{outline:3px solid var(--blue);outline-offset:3px}figcaption{font-size:13px;color:#526e80}footer{font-size:12px;color:#526e80;border-top:1px solid var(--line);padding-top:18px;margin-top:45px}@media(min-width:768px){main{padding:64px}}@media(max-width:600px){main{padding:22px}h1{font-size:34px}.toc{columns:1}table{font-size:12px}th,td{padding:7px}}@media print{body{background:#fff;font-size:10.5pt;line-height:1.5}main{max-width:none;padding:0}h1{font-size:34pt}h2{font-size:23pt}h3{font-size:15pt}article{break-before:page;margin-top:0}table{font-size:9pt}th,td{padding:7px}pre{font-size:8.5pt}.cover{min-height:150mm;padding-top:30mm}.toc{columns:1}nav{break-before:page}a{color:#126f9c;text-decoration:none}.architecture{break-inside:avoid}.note{break-inside:avoid}.diagram-viewport{overflow:visible;border:0;padding:0}.diagram-viewport a{width:auto;max-width:100%;min-width:0}.diagram img{min-width:0;width:auto;max-width:100%;max-height:180mm;margin:auto;object-fit:contain}.diagram figcaption{font-size:9pt}}
</style></head><body><main><header class="cover"><img class="logo" src="client/public/branding/dentabook-logo.jpg" alt="DentaBook"><p class="eyebrow">Client documentation · 31 October 2026</p><h1>DentaBook<br>Client Handbook</h1><p class="subtitle">Understanding, operating, and continuing your website.</p><p>Book your smile, know your cost.</p><div class="note"><strong>Current release:</strong> clinic discovery and account foundation. This handbook explains the delivered features, operating procedures, and remaining development phases.</div></header><nav aria-label="Handbook contents"><h2>Contents</h2><ol class="toc">'''+''.join(toc)+'''</ol></nav>'''+''.join(articles)+'''<footer>DentaBook · Client documentation · Use the source documentation and release notes supplied with each approved update.</footer></main></body></html>'''
    (root / 'CLIENT_GUIDE.html').write_text(document)
    print('Rendered printable client handbook.')

if __name__ == '__main__':
    main()
