// docs/js/components.js
// ============================================================
// 守夜者之书 - 公共组件渲染
// ============================================================

// ============================================================
// 1. 导航栏配置
// ============================================================
function getNavLinks() {
    var lang = window.CURRENT_LANG || 'zh'
    var prefix = '/' + lang
    var isZh = lang === 'zh'
    return {
        brand: { name: isZh ? '⚔️ 守夜者之书' : '⚔️ The Night Keeper\'s Book', link: prefix + '/' },
        links: [
            { text: isZh ? '首页' : 'Home', link: prefix + '/' },
            { text: isZh ? '教程' : 'Tutorials', link: prefix + '/tutorials/' },
            { text: isZh ? '关于' : 'About', link: prefix + '/about/' }
        ],
        github: 'https://github.com/TheSilentOne-creator/The-Night-Keeper-s-Book'
    }
}

// ============================================================
// 2. 渲染导航栏
// ============================================================
function renderNavbar() {
    var currentPath = window.location.pathname
    var config = getNavLinks()
    
    var navHtml = `
        <nav class="navbar">
            <div class="nav-container">
                <a href="${config.brand.link}" class="nav-brand">
                    ${config.brand.name}
                </a>
                <button class="nav-toggle" id="navToggle" aria-label="菜单">
                    <span></span>
                    <span></span>
                    <span></span>
                </button>
                <ul class="nav-links">
    `
    
    config.links.forEach(function(link) {
        var isActive = currentPath === link.link || 
                       (link.link !== '/' + (window.CURRENT_LANG || 'zh') + '/' && currentPath.startsWith(link.link))
        navHtml += `
            <li>
                <a href="${link.link}" class="${isActive ? 'active' : ''}">
                    ${link.text}
                </a>
            </li>
        `
    })
    
    navHtml += `
                </ul>
                <div class="nav-actions">
                    <button class="theme-toggle" id="themeToggle" aria-label="切换主题">
                        <svg id="themeIcon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                        </svg>
                    </button>
                    <a href="${config.github}" target="_blank" class="github-link" title="GitHub 仓库">
                        <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
                        </svg>
                    </a>
                </div>
            </div>
        </nav>
    `
    
    document.getElementById('navbar').innerHTML = navHtml
    
    // 移动端菜单切换
    var toggle = document.getElementById('navToggle')
    var links = document.querySelector('.nav-links')
    if (toggle && links) {
        toggle.addEventListener('click', function() {
            links.classList.toggle('open')
            toggle.classList.toggle('active')
        })
    }
}

// ============================================================
// 3. 渲染侧边栏
// ============================================================
function renderSidebar() {
    if (typeof window.SIDEBAR_CONFIG === 'undefined') {
        console.warn('⚠️ SIDEBAR_CONFIG 未加载')
        return
    }
    
    var currentPath = window.location.pathname
    var sidebarEl = document.getElementById('sidebar')
    if (!sidebarEl) {
        console.warn('⚠️ 找不到 #sidebar 元素')
        return
    }
    
    // ===== 根据语言设置所有文案 =====
    var lang = window.CURRENT_LANG || 'zh'
    var isZh = lang === 'zh'
    
    // 状态标签
    var statusMap = isZh ? {
        'done': '✅ 已完成',
        'writing': '✍️ 编写中',
        'coming': '⏳ 敬请期待'
    } : {
        'done': '✅ Done',
        'writing': '✍️ Writing',
        'coming': '⏳ Coming Soon'
    }
    
    // 搜索框占位文字
    var searchPlaceholder = isZh ? '🔍 搜索教程...' : '🔍 Search tutorials...'
    
    // 分类名称映射（英文）
    var categoryLabels = isZh ? {
        '⚔️ 基础工具': '⚔️ 基础工具',
        '🌐 网络安全（主线）': '🌐 网络安全（主线）',
        '🐍 Python 系列（中阶）': '🐍 Python 系列（中阶）',
        '🚀 进阶之路': '🚀 进阶之路'
    } : {
        '⚔️ 基础工具': '⚔️ Core Tools',
        '🌐 网络安全（主线）': '🌐 Cybersecurity (Main)',
        '🐍 Python 系列（中阶）': '🐍 Python Series (Intermediate)',
        '🚀 进阶之路': '🚀 Advanced Path'
    }
    
    var sidebarHtml = `
        <div class="sidebar-inner">
            <div class="sidebar-search">
                <input type="text" id="sidebarSearch" placeholder="${searchPlaceholder}" />
            </div>
            <ul class="sidebar-menu">
    `
    
    window.SIDEBAR_CONFIG.forEach(function(group) {
        // 分类名翻译
        var categoryDisplay = categoryLabels[group.category] || group.category
        sidebarHtml += '<li class="sidebar-category">' + categoryDisplay + '</li>'
        group.items.forEach(function(item) {
            var isActive = currentPath === item.link || 
                           (item.link !== '/' && currentPath.startsWith(item.link))
            
            var statusText = item.status ? statusMap[item.status] : ''
            var statusClass = item.status ? 'status-' + item.status : ''
            
            sidebarHtml += `
                <li>
                    <a href="${item.link}" class="${isActive ? 'active' : ''} ${statusClass}">
                        ${item.text}
                        ${statusText ? '<span class="status-badge">' + statusText + '</span>' : ''}
                    </a>
                </li>
            `
        })
    })
    
    sidebarHtml += `
            </ul>
        </div>
    `
    
    sidebarEl.innerHTML = sidebarHtml
    
    // 搜索功能
    var searchInput = document.getElementById('sidebarSearch')
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            var query = this.value.toLowerCase()
            var items = sidebarEl.querySelectorAll('.sidebar-menu li:not(.sidebar-category)')
            items.forEach(function(item) {
                var text = item.textContent.toLowerCase()
                item.style.display = text.includes(query) ? '' : 'none'
            })
        })
    }
}

// ============================================================
// 4. 渲染页脚
// ============================================================
function renderFooter() {
    var footerEl = document.getElementById('footer')
    if (!footerEl) {
        console.warn('⚠️ 找不到 #footer 元素')
        return
    }
    
    fetch('/components/footer.html')
        .then(function(res) {
            if (!res.ok) throw new Error('footer.html 加载失败')
            return res.text()
        })
        .then(function(html) {
            footerEl.innerHTML = html
            console.log('✅ 页脚已加载')
        })
        .catch(function(err) {
            console.warn('⚠️ 页脚加载失败:', err)
            footerEl.innerHTML = `
                <footer class="site-footer">
                    <div class="footer-container">
                        <div class="footer-oath">
                            <p>「长夜将至，我从今开始守夜，今夜如此，夜夜皆然。」</p>
                        </div>
                        <div class="footer-info">
                            <p>© 2026 守夜者之书 · CC BY-NC-SA 4.0</p>
                        </div>
                    </div>
                </footer>
            `
        })
}

// ============================================================
// 5. 主题切换
// ============================================================
(function() {
    var THEME_KEY = 'nightkeeper-theme'
    
    function setTheme(theme) {
        localStorage.setItem(THEME_KEY, theme)
        if (theme === 'light') {
            document.documentElement.classList.add('light-theme')
        } else {
            document.documentElement.classList.remove('light-theme')
        }
        updateIcon(theme === 'light')
    }
    
    function updateIcon(isLight) {
        var icon = document.getElementById('themeIcon')
        if (!icon) return
        if (isLight) {
            icon.innerHTML = '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>'
        } else {
            icon.innerHTML = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>'
        }
    }
    
    function toggleTheme() {
        var current = localStorage.getItem(THEME_KEY)
        var next = current === 'light' ? 'dark' : 'light'
        setTheme(next)
    }
    
    function initIcon() {
        var theme = localStorage.getItem(THEME_KEY)
        updateIcon(theme === 'light')
    }
    
    // 绑定切换按钮
    function bindToggle() {
        var toggleBtn = document.getElementById('themeToggle')
        if (toggleBtn) {
            toggleBtn.addEventListener('click', toggleTheme)
        } else {
            setTimeout(bindToggle, 100)
        }
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initIcon)
    } else {
        initIcon()
    }
    
    bindToggle()
    
    window.theme = {
        set: setTheme,
        toggle: toggleTheme,
        get: function() { return localStorage.getItem(THEME_KEY) }
    }
})();

// ============================================================
// 6. 暴露给全局
// ============================================================
window.renderNavbar = renderNavbar
window.renderSidebar = renderSidebar
window.renderFooter = renderFooter

console.log('✅ components.js 已加载')