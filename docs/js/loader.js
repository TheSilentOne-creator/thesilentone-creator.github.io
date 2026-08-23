// docs/js/loader.js
// ============================================================
// 守夜者之书 - 页面加载器（支持中英文）
// ============================================================

// ============================================================
// 辅助函数：获取当前语言（从 URL 路径）
// ============================================================
function getCurrentLang() {
    var path = window.location.pathname
    
    // 优先从路径判断
    if (path.startsWith('/en/')) return 'en'
    if (path.startsWith('/zh/')) return 'zh'
    
    // 如果路径是根目录，从 localStorage 或浏览器语言判断
    var saved = localStorage.getItem('nightkeeper-lang')
    if (saved === 'zh' || saved === 'en') return saved
    
    var browserLang = navigator.language || navigator.userLanguage
    return (browserLang && browserLang.startsWith('zh')) ? 'zh' : 'en'
}

function buildSidebarConfig(data, lang) {
    var categoryMap = {
        '01-markdown': '基础工具',
        '02-vscode': '基础工具',
        '03-vim': '基础工具',
        '04-git': '基础工具',
        '05-cybersecurity-season0': '网络安全（主线）',
        '05-cybersecurity-season1': '网络安全（主线）',
        '06-python-1': 'Python 系列（中阶）',
        '06-python-2': 'Python 系列（中阶）',
        '06-python-3': 'Python 系列（中阶）',
        '06-python-4': 'Python 系列（中阶）',
        '07-rust': '进阶之路',
        '08-cs-canon': '进阶之路'
    }
    
    var categoryLabels = {
        '基础工具': '⚔️ 基础工具',
        '网络安全（主线）': '🌐 网络安全（主线）',
        'Python 系列（中阶）': '🐍 Python 系列（中阶）',
        '进阶之路': '🚀 进阶之路'
    }
    
    var result = {}
    var tutorials = data.tutorials || []
    
    tutorials.forEach(function(t) {
        var cat = categoryMap[t.id] || '其他'
        if (!result[cat]) result[cat] = []
        var content = t[lang] || t['zh']
        result[cat].push({
            text: content.title,
            link: content.link,
            status: t.status
        })
    })
    
    var sidebarArray = []
    for (var cat in result) {
        sidebarArray.push({
            category: categoryLabels[cat] || cat,
            items: result[cat]
        })
    }
    return sidebarArray
}

// ============================================================
// 0. 加载公共 head
// ============================================================
fetch('/components/head.html')
    .then(function(res) {
        if (!res.ok) throw new Error('head.html 加载失败')
        return res.text()
    })
    .then(function(html) {
        document.head.insertAdjacentHTML('beforeend', html)
        console.log('✅ 公共 head 已加载')
    })
    .catch(function(err) {
        console.warn('⚠️ head.html 加载失败:', err)
    })

// ============================================================
// 1. 加载教程数据
// ============================================================
fetch('/data/tutorials.json')
    .then(function(res) {
        if (!res.ok) throw new Error('tutorials.json 加载失败')
        return res.json()
    })
    .then(function(data) {
        var lang = getCurrentLang()
        window.TUTORIALS_DATA = data
        window.CURRENT_LANG = lang
        window.SIDEBAR_CONFIG = buildSidebarConfig(data, lang)
        console.log('✅ 教程数据已加载，当前语言:', lang)
    })
    .catch(function(err) {
        console.warn('⚠️ 教程数据加载失败:', err)
        window.SIDEBAR_CONFIG = []
    })
    .finally(function() {
        // ============================================================
        // 2. 加载 components.js
        // ============================================================
        var script = document.createElement('script')
        script.src = '/js/components.js'
        script.onload = function() {
            console.log('✅ components.js 已加载')
            
            // 渲染导航栏和页脚
            if (typeof renderNavbar === 'function') renderNavbar()
            if (typeof renderFooter === 'function') renderFooter()
            
            // ============================================================
            // 3. 加载 i18n.js（语言切换按钮）
            // ============================================================
            var i18nScript = document.createElement('script')
            i18nScript.src = '/js/i18n.js'
            document.body.appendChild(i18nScript)
            
            // ============================================================
            // 4. 判断页面类型，决定侧边栏
            // ============================================================
            var currentPath = window.location.pathname
            var lang = getCurrentLang()
            
            var isHome = (currentPath === '/' + lang + '/' || 
                          currentPath === '/' + lang + '/index.html' ||
                          currentPath === '/' || currentPath === '/index.html')
            
            if (isHome) {
                // 首页：使用 renderSidebar 渲染教程列表
                if (typeof renderSidebar === 'function') {
                    renderSidebar()
                    console.log('🏠 首页：渲染侧边栏')
                }
            } else {
                // 其他页面：加载 toc.js 生成目录
                var tocScript = document.createElement('script')
                tocScript.src = '/js/toc.js'
                tocScript.onload = function() {
                    console.log('✅ toc.js 已加载')
                    if (typeof generateTOC === 'function') {
                        generateTOC()
                    }
                }
                document.body.appendChild(tocScript)
            }
        }
        document.body.appendChild(script)
    })