#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
守夜者之书 - Markdown 批量转 HTML 构建工具
支持：GFM 语法 + 代码高亮 + Mermaid + MathJax + 任务列表 + 代码复制
"""

import os
import re
import json
import html as html_module
from pathlib import Path
import markdown
from pygments import highlight
from pygments.lexers import get_lexer_by_name
from pygments.formatters import HtmlFormatter

BASE_DIR = Path(__file__).parent
DATA_FILE = BASE_DIR / 'data' / 'tutorials.json'


# ============================================================
# 解析 tutorials.md
# ============================================================
def parse_series_sidebar(md_file_path, current_page_name):
    if not md_file_path.exists():
        return None, '<li class="sidebar-category">暂无目录</li>'

    with open(md_file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    lines = content.split('\n')
    series_title = None
    in_list = False
    chapters = []
    stack = [chapters]
    indent_levels = [0]

    for line in lines:
        line = line.rstrip()

        if line.startswith('# ') and not series_title:
            series_title = line[2:].strip()
            continue

        if line.startswith('## 章节列表') or line.startswith('## Chapters'):
            in_list = True
            continue

        if not in_list:
            continue

        indent = len(line) - len(line.lstrip())
        stripped = line.strip()

        if not stripped:
            continue

        match = re.match(r'^[-*]?\s*\[([^\]]+)\]\(([^)]+)\)', stripped)
        if not match:
            match = re.match(r'^\d+\.\s*\[([^\]]+)\]\(([^)]+)\)', stripped)

        if match:
            title = match.group(1)
            link = match.group(2)
            is_active = (link == current_page_name or
                        link == f'./{current_page_name}' or
                        Path(link).name == current_page_name)

            if indent == 0:
                chapters.append({
                    'title': title,
                    'link': link,
                    'active': is_active,
                    'children': [],
                    'level': 0
                })
                stack = [chapters]
                indent_levels = [0]
            else:
                level = indent // 2

                while len(stack) > level + 1:
                    stack.pop()
                    indent_levels.pop()

                if level > indent_levels[-1]:
                    parent = stack[-1][-1] if stack[-1] else None
                    if parent and 'children' in parent:
                        parent['children'].append({
                            'title': title,
                            'link': link,
                            'active': is_active,
                            'children': [],
                            'level': level
                        })
                        stack.append(parent['children'])
                        indent_levels.append(level)
                    else:
                        stack[-1].append({
                            'title': title,
                            'link': link,
                            'active': is_active,
                            'children': [],
                            'level': level
                        })
                else:
                    stack[-1].append({
                        'title': title,
                        'link': link,
                        'active': is_active,
                        'children': [],
                        'level': level
                    })
                    indent_levels[-1] = level

    if not series_title:
        series_title = "系列目录"

    def render_sidebar_items(items, level=0):
        html = ''
        for item in items:
            active_class = 'active' if item.get('active', False) else ''
            indent_style = f'padding-left: {20 + level * 16}px;' if level > 0 else ''
            html += f'''
            <li>
                <a href="{item['link']}" class="{active_class}" style="{indent_style}">
                    {item['title']}
                </a>
            </li>'''
            if item.get('children'):
                html += render_sidebar_items(item['children'], level + 1)
        return html

    sidebar_html = f'<li class="sidebar-category">{series_title}</li>'
    sidebar_html += render_sidebar_items(chapters)

    return series_title, sidebar_html


# ============================================================
# Markdown → HTML
# ============================================================
class MarkdownToHTML:
    def __init__(self, md_file_path):
        self.md_file_path = md_file_path
        self.md = markdown.Markdown(extensions=[
            'extra',
            'toc',
            'sane_lists',
            'nl2br',
            'smarty',
        ])

    def convert(self, md_text):
        md_text = self._fix_image_paths(md_text)
        md_text = self._fix_link_paths(md_text)
        html = self.md.convert(md_text)
        html = self._fix_task_lists(html)
        html = self._highlight_code_blocks(html)
        return html

    def _fix_image_paths(self, md_text):
        def replace_image(match):
            alt = match.group(1)
            path = match.group(2)
            if path.startswith('/') or path.startswith('http://') or path.startswith('https://'):
                return f'![{alt}]({path})'
            md_dir = self.md_file_path.parent
            img_path = md_dir / path
            if img_path.exists():
                rel_path = img_path.relative_to(BASE_DIR)
                return f'![{alt}](/{rel_path})'
            return f'![{alt}]({path})'

        pattern = r'!\[([^\]]*)\]\(([^)]+)\)'
        return re.sub(pattern, replace_image, md_text)

    def _fix_link_paths(self, md_text):
        def replace_link(match):
            text = match.group(1)
            path = match.group(2)
            if path.startswith('/') or path.startswith('http://') or path.startswith('https://') or path.startswith('#'):
                return f'[{text}]({path})'
            md_dir = self.md_file_path.parent
            link_path = md_dir / path
            if link_path.exists():
                rel_path = link_path.relative_to(BASE_DIR)
                return f'[{text}](/{rel_path})'
            return f'[{text}]({path})'

        pattern = r'(?<!\!)\[([^\]]*)\]\(([^)]+)\)'
        return re.sub(pattern, replace_link, md_text)

    def _fix_task_lists(self, html):
        """将 - [ ] 和 - [x] 转为带复选框的 HTML（静态）"""
        html = re.sub(
            r'<li>\[\s*\]\s*(.*?)</li>',
            r'<li class="task-item unchecked"><input type="checkbox" disabled> \1</li>',
            html,
            flags=re.DOTALL
        )
        html = re.sub(
            r'<li>\[[xX]\]\s*(.*?)</li>',
            r'<li class="task-item checked"><input type="checkbox" disabled checked> \1</li>',
            html,
            flags=re.DOTALL
        )
        return html

    def _highlight_code_blocks(self, html):
        """高亮代码块 + 添加复制按钮"""
        pattern = r'<pre><code class="language-(\w+)">(.*?)</code></pre>'

        def replace_code_block(match):
            language = match.group(1)
            code = match.group(2)
            code = html_module.unescape(code)

            try:
                lexer = get_lexer_by_name(language, stripall=True)
                formatter = HtmlFormatter(style='monokai', cssclass='codehilite')
                highlighted = highlight(code, lexer, formatter)
            except:
                highlighted = f'<pre><code class="language-{language}">{code}</code></pre>'

            return f'''
<div class="code-block-wrapper">
    <button class="copy-btn" onclick="copyCode(this)">复制</button>
    {highlighted}
</div>'''

        return re.sub(pattern, replace_code_block, html, flags=re.DOTALL)


# ============================================================
# 辅助函数
# ============================================================
def load_tutorials_data():
    with open(DATA_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)


def find_markdown_files(tutorial_id, lang):
    search_dir = BASE_DIR / lang / 'tutorials' / tutorial_id
    if not search_dir.exists():
        return []
    md_files = sorted([f for f in search_dir.glob('*.md') if f.name != 'tutorials.md'])
    return md_files


def extract_title(md_content, default_title):
    for line in md_content.split('\n'):
        if line.startswith('# ') and not line.startswith('## '):
            return line[2:].strip()
    return default_title


def get_series_nav(md_files, current_file):
    sorted_files = sorted(md_files)
    for i, f in enumerate(sorted_files):
        if f.name == current_file.name:
            prev_file = sorted_files[i - 1] if i > 0 else None
            next_file = sorted_files[i + 1] if i < len(sorted_files) - 1 else None
            return prev_file, next_file
    return None, None


def generate_html_page(tutorial, lang, title, body_html, prev_file, next_file,
                       series_sidebar_html, series_title):
    title_clean = re.sub(r'^[^\w\u4e00-\u9fa5]+\s*', '', title)

    status_map = {
        'done': ('✅ Done' if lang == 'en' else '✅ 已完成', 'done'),
        'writing': ('✍️ Writing' if lang == 'en' else '✍️ 编写中', 'writing'),
        'coming': ('⏳ Coming Soon' if lang == 'en' else '⏳ 敬请期待', 'coming')
    }
    status_display, status_class = status_map.get(tutorial['status'], ('', ''))

    prev_html = ''
    if prev_file:
        prev_content = prev_file.read_text(encoding='utf-8')
        prev_title = extract_title(prev_content, prev_file.stem)
        prev_link = prev_file.name.replace('.md', '.html')
        prev_html = f'<a href="{prev_link}" class="prev">← {prev_title}</a>'
    else:
        prev_html = '<span class="prev disabled">← ' + ('Previous' if lang == 'en' else '上一篇') + '</span>'

    next_html = ''
    if next_file:
        next_content = next_file.read_text(encoding='utf-8')
        next_title = extract_title(next_content, next_file.stem)
        next_link = next_file.name.replace('.md', '.html')
        next_html = f'<a href="{next_link}" class="next">{next_title} →</a>'
    else:
        next_html = '<span class="next disabled">' + ('Next' if lang == 'en' else '下一篇') + ' →</span>'

    lang_code = 'zh-CN' if lang == 'zh' else 'en'
    home_text = '首页' if lang == 'zh' else 'Home'
    tutorials_text = '教程' if lang == 'zh' else 'Tutorials'

    html = f'''<!DOCTYPE html>
<html lang="{lang_code}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title} · {"The Night Keeper's Book" if lang == 'en' else '守夜者之书'}</title>

    <!-- ===== 主题预加载：在 CSS 渲染前确定主题 ===== -->
    <script>
        (function() {{
            var theme = localStorage.getItem('nightkeeper-theme')
            if (!theme) {{
                var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
                theme = prefersDark ? 'dark' : 'light'
            }}
            if (theme === 'light') {{
                document.documentElement.classList.add('light-theme')
            }}
        }})()
    </script>

    <link rel="preload" href="/css/style.css" as="style">
    <link rel="stylesheet" href="/css/style.css">
    <link rel="icon" type="image/svg+xml" href="/favicon.svg">
    <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&display=swap" rel="stylesheet">

    <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
    <script>
        document.addEventListener('DOMContentLoaded', function() {{
            mermaid.initialize({{
                theme: 'dark',
                themeVariables: {{
                    background: '#0a0e14',
                    primaryColor: '#64ffda',
                    primaryTextColor: '#e6edf3',
                    primaryBorderColor: '#64ffda',
                    lineColor: '#64ffda',
                    secondaryColor: '#1a2636',
                    tertiaryColor: '#111821'
                }}
            }});
        }});
    </script>

    <script>
        MathJax = {{
            tex: {{
                inlineMath: [['$', '$'], ['\\\\(', '\\\\)']],
                displayMath: [['$$', '$$'], ['\\\\[', '\\\\]']]
            }},
            svg: {{
                fontCache: 'global'
            }}
        }};
    </script>
    <script src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js" async></script>

    <style>
        .sidebar-menu .sidebar-category {{
            font-size: 13px;
            font-weight: 700;
            color: var(--accent);
            padding: 16px 12px 8px 12px;
            border-bottom: 1px solid var(--border);
            margin-bottom: 8px;
        }}
        .sidebar-menu li a {{
            display: block;
            padding: 4px 12px 4px 20px;
            border-radius: 4px;
            font-size: 14px;
            color: var(--text-secondary);
            transition: all 0.15s;
            text-decoration: none;
        }}
        .sidebar-menu li a:hover {{
            color: var(--text-primary);
            background: var(--bg-hover);
        }}
        .sidebar-menu li a.active {{
            color: var(--accent);
            background: var(--accent-dim);
            border-left: 3px solid var(--accent);
        }}
        .mermaid {{
            background: var(--bg-code);
            padding: 20px;
            border-radius: 8px;
            margin: 16px 0 24px 0;
            border-left: 3px solid var(--accent);
            text-align: center;
        }}
        .MathJax {{
            color: var(--text-primary) !important;
        }}
        .codehilite {{ background: #0d1117; padding: 16px 20px; border-radius: 0 8px 8px 0; overflow-x: auto; border-left: 3px solid #64ffda; }}
        .codehilite pre {{ margin: 0; background: transparent; }}
        .tutorial-body table {{
            width: 100%;
            border-collapse: collapse;
            margin: 16px 0;
        }}
        .tutorial-body th, .tutorial-body td {{
            border: 1px solid var(--border);
            padding: 8px 12px;
            text-align: left;
        }}
        .tutorial-body th {{
            background: var(--bg-card);
            color: var(--text-primary);
        }}
        .tutorial-body td {{
            color: var(--text-secondary);
        }}
        /* 任务列表样式 */
        .tutorial-body .task-item {{
            list-style: none;
            display: flex;
            align-items: flex-start;
            gap: 8px;
            padding: 4px 0;
        }}
        .tutorial-body .task-item input[type="checkbox"] {{
            margin-top: 4px;
            width: 16px;
            height: 16px;
            flex-shrink: 0;
            accent-color: var(--accent);
            cursor: default;
        }}
        .tutorial-body .task-item.checked {{
            opacity: 0.7;
        }}
        .tutorial-body .task-item.checked input[type="checkbox"] {{
            accent-color: #3fb950;
        }}
        /* 代码块复制按钮 */
        .code-block-wrapper {{
            position: relative;
            margin: 16px 0 24px 0;
        }}
        .code-block-wrapper .codehilite,
        .code-block-wrapper pre {{
            margin: 0 !important;
        }}
        .copy-btn {{
            position: absolute;
            top: 8px;
            right: 8px;
            padding: 4px 12px;
            background: var(--bg-secondary);
            border: 1px solid var(--border);
            border-radius: 4px;
            color: var(--text-muted);
            font-size: 12px;
            font-family: var(--font-mono);
            cursor: pointer;
            transition: all 0.2s;
            opacity: 0;
        }}
        .code-block-wrapper:hover .copy-btn {{
            opacity: 1;
        }}
        .copy-btn:hover {{
            color: var(--text-primary);
            border-color: var(--accent);
            background: var(--bg-hover);
        }}
        .copy-btn.copied {{
            color: var(--accent);
            border-color: var(--accent);
        }}
        /* 侧边栏 Tab */
        .sidebar-tabs {{
            padding: 8px 12px 12px 12px;
            border-bottom: 1px solid var(--border);
            margin-bottom: 8px;
            display: flex;
            gap: 4px;
        }}
        .sidebar-tab {{
            flex: 1;
            padding: 6px 10px;
            border: 1px solid var(--border);
            border-radius: 6px;
            background: transparent;
            color: var(--text-muted);
            font-size: 12px;
            font-family: var(--font-mono);
            cursor: pointer;
            transition: all 0.2s;
            text-align: center;
        }}
        .sidebar-tab:hover {{
            color: var(--text-secondary);
            border-color: var(--border-light);
        }}
        .sidebar-tab.active {{
            color: var(--accent);
            border-color: var(--accent);
            background: var(--accent-dim);
        }}
        .tab-content {{
            display: none;
        }}
        .tab-content.active {{
            display: block;
        }}
        .toc-empty {{
            color: var(--text-muted);
            padding: 12px;
            font-size: 14px;
            text-align: center;
        }}
        /* 教程目录列表 */
        .series-toc-list .toc-link {{
            font-size: 13px;
        }}
        .series-toc-list .toc-link.active {{
            color: var(--accent);
            background: var(--accent-dim);
            border-left: 3px solid var(--accent);
        }}
    </style>
</head>
<body>
    <div id="navbar"></div>

    <aside class="sidebar" id="sidebar"></aside>

    <main class="main-content">
        <div class="content-inner tutorial-content">

            <nav class="breadcrumb">
                <a href="/{lang}/">{home_text}</a>
                <span class="separator">/</span>
                <a href="/{lang}/tutorials/">{tutorials_text}</a>
                <span class="separator">/</span>
                <span class="current">{series_title}</span>
            </nav>

            <header class="tutorial-header">
                <div class="tutorial-meta">
                    <span class="tutorial-number">{tutorial['number']}</span>
                    <span class="tutorial-status {status_class}">{status_display}</span>
                    <span class="tutorial-level">{tutorial.get('level', '')}</span>
                    <span class="tutorial-readtime">⏱️ {"About 30 min" if lang == 'en' else '约 30 分钟'}</span>
                </div>
            </header>

            <section class="tutorial-body">
                {body_html}
            </section>

            <div class="tutorial-nav">
                {prev_html}
                {next_html}
            </div>

        </div>
    </main>

    <div id="footer"></div>

    <script src="/js/loader.js"></script>
    <script>
        function copyCode(btn) {{
            var wrapper = btn.parentElement;
            var codeBlock = wrapper.querySelector('.codehilite pre, pre');
            if (!codeBlock) return;

            var code = codeBlock.textContent;
            navigator.clipboard.writeText(code).then(function() {{
                btn.textContent = '✅ 已复制';
                btn.classList.add('copied');
                setTimeout(function() {{
                    btn.textContent = '复制';
                    btn.classList.remove('copied');
                }}, 2000);
            }}).catch(function() {{
                var textarea = document.createElement('textarea');
                textarea.value = code;
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
                btn.textContent = '✅ 已复制';
                setTimeout(function() {{
                    btn.textContent = '复制';
                }}, 2000);
            }});
        }}

        document.addEventListener('DOMContentLoaded', function() {{
            if (typeof mermaid !== 'undefined') {{
                mermaid.run({{
                    querySelector: '.mermaid'
                }});
            }}
        }});
    </script>
</body>
</html>'''

    return html


# ============================================================
# 批量处理教程内容页
# ============================================================
def batch_process_all_tutorials():
    data = load_tutorials_data()
    tutorials = data['tutorials']

    results = []
    total = len(tutorials)

    print(f'📚 共 {total} 个教程需要处理\n')

    for idx, tutorial in enumerate(tutorials):
        tutorial_id = tutorial['id']
        print(f'[{idx+1}/{total}] 处理: {tutorial_id}')

        for lang in ['zh', 'en']:
            lang_data = tutorial.get(lang)
            if not lang_data:
                continue

            md_files = find_markdown_files(tutorial_id, lang)

            if not md_files:
                print(f'  ⚠️ 未找到 [{lang}] Markdown 文件')
                continue

            sidebar_file = BASE_DIR / lang / 'tutorials' / tutorial_id / 'tutorials.md'

            for md_file in md_files:
                print(f'  📖 处理 [{lang}]: {md_file.name}')

                md_content = md_file.read_text(encoding='utf-8')
                title = extract_title(md_content, md_file.stem)

                series_title, series_sidebar_html = parse_series_sidebar(
                    sidebar_file,
                    md_file.name.replace('.md', '.html')
                )

                prev_file, next_file = get_series_nav(md_files, md_file)

                converter = MarkdownToHTML(md_file)
                body_html = converter.convert(md_content)

                html = generate_html_page(
                    tutorial, lang, title, body_html,
                    prev_file, next_file,
                    series_sidebar_html, series_title or tutorial_id
                )

                output_file = md_file.parent / md_file.name.replace('.md', '.html')
                output_file.write_text(html, encoding='utf-8')

                print(f'    ✅ 生成: {output_file}')
                results.append({'tutorial': tutorial_id, 'lang': lang, 'file': md_file.name})

        print()

    return results


# ============================================================
# 清理静态页面的侧边栏（让 toc.js 接管）
# ============================================================

def clean_static_pages():
    """
    清理 about 和 tutorials 列表页的侧边栏，只保留空容器
    让 toc.js 动态生成
    """
    pages = [
        ('zh', 'about', 'index.html'),
        ('en', 'about', 'index.html'),
        ('zh', 'tutorials', 'index.html'),
        ('en', 'tutorials', 'index.html'),
    ]

    for lang, folder, filename in pages:
        page_path = BASE_DIR / lang / folder / filename
        if not page_path.exists():
            print(f'  ⚠️ 文件不存在: {page_path}')
            continue

        content = page_path.read_text(encoding='utf-8')

        # ===== 直接删掉所有硬编码的侧边栏脚本，只保留空容器 =====
        # 1. 删除 <aside class="sidebar"...>...</aside> 之间的所有内容
        # 2. 删除紧跟其后的 <script>...</script>
        
        # 先删除侧边栏容器内的所有内容（保留容器本身）
        content = re.sub(
            r'(<aside\s+class="sidebar"\s+id="sidebar">).*?(</aside>)',
            r'\1\2',
            content,
            flags=re.DOTALL
        )
        
        # 再删除紧跟在 </aside> 后面的 <script>...</script>
        content = re.sub(
            r'(</aside>)\s*<script>.*?</script>',
            r'\1',
            content,
            flags=re.DOTALL
        )

        page_path.write_text(content, encoding='utf-8')
        print(f'  ✅ 已清理: {page_path}')


# ============================================================
# 主函数
# ============================================================
def main():
    print('🔧 守夜者之书 - Markdown 批量构建工具')
    print('=' * 60)
    print('  ✅ 支持 GFM 语法（表格、任务列表、删除线等）')
    print('  ✅ 支持代码语法高亮（pygments）')
    print('  ✅ 支持图片渲染（路径自动修正）')
    print('  ✅ 支持 Mermaid 流程图（客户端渲染）')
    print('  ✅ 支持 MathJax 数学公式（客户端渲染）')
    print('  ✅ 支持多级系列目录侧边栏（tutorials.md）')
    print('  ✅ 支持系列内上一篇/下一篇导航')
    print('  ✅ 支持代码块复制按钮')
    print('=' * 60 + '\n')

    # 1. 生成教程内容页
    results = batch_process_all_tutorials()

    print('=' * 60)
    print(f'🎉 教程内容页构建完成！共处理 {len(results)} 个文件')
    print('=' * 60 + '\n')

    # 2. 清理静态页面侧边栏
    print('🧹 清理静态页面侧边栏（让 toc.js 接管）...')
    clean_static_pages()

    print('\n' + '=' * 60)
    print('🎉 全部完成！')


if __name__ == '__main__':
    main()