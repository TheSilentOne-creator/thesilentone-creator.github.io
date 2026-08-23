// docs/js/toc.js
// 侧边栏 Tab 切换：本页目录 ↔ 教程目录

function generateTOC() {
    var sidebar = document.getElementById('sidebar')
    if (!sidebar) {
        console.warn('⚠️ 找不到 #sidebar 元素')
        return
    }

    var currentPath = window.location.pathname

    // 首页不生成 TOC
    if (currentPath === '/' || currentPath === '/index.html' ||
        currentPath === '/zh/' || currentPath === '/zh/index.html' ||
        currentPath === '/en/' || currentPath === '/en/index.html') {
        if (typeof renderSidebar === 'function') {
            renderSidebar()
        }
        return
    }

    // 判断是否是静态页面（只显示本页目录，不带标题）
    var isStaticPage = currentPath.includes('/about/') || 
                       currentPath.includes('/tutorials/index.html') ||
                       currentPath === '/zh/tutorials/' || 
                       currentPath === '/en/tutorials/' ||
                       currentPath === '/zh/about/' || 
                       currentPath === '/en/about/'

    var content = document.querySelector('.tutorial-content, .content-inner')
    if (!content) {
        console.warn('⚠️ 找不到 .tutorial-content 或 .content-inner')
        return
    }

    // ============================================================
    // 生成本页目录
    // ============================================================
    var headings = content.querySelectorAll('h1[id], h2[id], h3[id], h4[id]')
    var pageTocHtml = ''
    if (headings.length > 0) {
        pageTocHtml = '<ul class="toc-list">'
        headings.forEach(function(heading) {
            var level = parseInt(heading.tagName.charAt(1))
            var indent = (level - 1) * 16
            var text = heading.textContent.trim()
            pageTocHtml += `
                <li class="toc-item toc-level-${level}" style="padding-left: ${indent}px;">
                    <a href="#${heading.id}" class="toc-link">
                        ${text}
                    </a>
                </li>
            `
        })
        pageTocHtml += '</ul>'
    } else {
        pageTocHtml = '<p class="toc-empty">暂无目录</p>'
    }

    // ============================================================
    // 如果是静态页面：只显示目录内容（不带标题）
    // ============================================================
    if (isStaticPage) {
        sidebar.innerHTML = pageTocHtml
        bindTOCLinks(sidebar)
        return
    }

    // ============================================================
    // 教程内容页：显示本页目录 + 教程目录
    // ============================================================
    var pathParts = currentPath.split('/')
    var lang = pathParts[1] || 'zh'
    var tutorialId = null
    for (var i = 0; i < pathParts.length; i++) {
        if (pathParts[i] === 'tutorials' && i + 1 < pathParts.length) {
            tutorialId = pathParts[i + 1]
            break
        }
    }

    var seriesTocHtml = '<p class="toc-empty">加载中...</p>'

    if (tutorialId) {
        var jsonPath = '/' + lang + '/tutorials/' + tutorialId + '/tutorials.json'
        fetch(jsonPath)
            .then(function(res) {
                if (!res.ok) throw new Error('tutorials.json 加载失败')
                return res.json()
            })
            .then(function(data) {
                var chapters = data.chapters || []
                var seriesTitle = data.title || data.zh?.title || tutorialId
                var container = document.getElementById('series-toc-content')
                if (!container) return

                if (chapters.length === 0) {
                    container.innerHTML = '<p class="toc-empty">暂无章节</p>'
                    return
                }
                var html = '<div class="series-title">' + seriesTitle + '</div>'
                html += '<ul class="toc-list series-toc-list">'
                chapters.forEach(function(ch) {
                    var isActive = ch.link === currentPath || currentPath.indexOf(ch.link) !== -1
                    var paddingLeft = 20 + (ch.level || 0) * 16
                    html += `
                        <li class="toc-item series-item" style="padding-left: ${paddingLeft}px;">
                            <a href="${ch.link}" class="toc-link ${isActive ? 'active' : ''}">
                                ${ch.title}
                            </a>
                        </li>
                    `
                })
                html += '</ul>'
                container.innerHTML = html
            })
            .catch(function(err) {
                console.warn('⚠️ 加载 tutorials.json 失败:', err)
                var container = document.getElementById('series-toc-content')
                if (container) {
                    container.innerHTML = '<p class="toc-empty">暂无教程目录</p>'
                }
            })
    }

    sidebar.innerHTML = `
        <div class="sidebar-inner">
            <div class="sidebar-tabs">
                <button class="sidebar-tab active" data-tab="page" id="tab-page">📖 本页目录</button>
                <button class="sidebar-tab" data-tab="series" id="tab-series">📚 教程目录</button>
            </div>
            <div class="tab-content active" id="tab-content-page">
                ${pageTocHtml}
            </div>
            <div class="tab-content" id="tab-content-series">
                <div id="series-toc-content">${seriesTocHtml}</div>
            </div>
        </div>
    `

    // Tab 切换
    var tabPage = document.getElementById('tab-page')
    var tabSeries = document.getElementById('tab-series')
    var contentPage = document.getElementById('tab-content-page')
    var contentSeries = document.getElementById('tab-content-series')

    function switchTab(tab) {
        tabPage.classList.toggle('active', tab === 'page')
        tabSeries.classList.toggle('active', tab === 'series')
        contentPage.classList.toggle('active', tab === 'page')
        contentSeries.classList.toggle('active', tab === 'series')
        localStorage.setItem('sidebar-tab', tab)
    }

    tabPage.addEventListener('click', function() { switchTab('page') })
    tabSeries.addEventListener('click', function() { switchTab('series') })

    var savedTab = localStorage.getItem('sidebar-tab')
    if (savedTab === 'series') {
        switchTab('series')
    }

    // 绑定本页目录的链接
    bindTOCLinks(document.getElementById('tab-content-page'))


    // ============================================================
    // 辅助函数：绑定 TOC 链接点击和滚动高亮
    // ============================================================
    function bindTOCLinks(container) {
        if (!container) return

        var tocLinks = container.querySelectorAll('.toc-link')
        if (tocLinks.length === 0) return

        // 获取 headings
        var headings = content.querySelectorAll('h1[id], h2[id], h3[id], h4[id]')

        tocLinks.forEach(function(link) {
            link.addEventListener('click', function(e) {
                e.preventDefault()
                var targetId = this.getAttribute('href').substring(1)
                var target = document.getElementById(targetId)
                if (!target) return

                var navbarHeight = 64
                var targetPosition = target.getBoundingClientRect().top + window.pageYOffset - navbarHeight - 16
                window.scrollTo({ top: targetPosition, behavior: 'smooth' })

                tocLinks.forEach(function(l) { l.classList.remove('active') })
                this.classList.add('active')
                history.pushState(null, null, '#' + targetId)
            })
        })

        function updateActiveTOC() {
            var navbarHeight = 64
            var currentId = null
            headings.forEach(function(heading) {
                var rect = heading.getBoundingClientRect()
                if (rect.top <= navbarHeight + 20) {
                    currentId = heading.id
                }
            })
            tocLinks.forEach(function(link) {
                link.classList.toggle('active', link.getAttribute('href') === '#' + currentId)
            })
        }

        var ticking = false
        window.addEventListener('scroll', function() {
            if (!ticking) {
                window.requestAnimationFrame(function() {
                    updateActiveTOC()
                    ticking = false
                })
                ticking = true
            }
        })

        setTimeout(function() {
            var hash = window.location.hash
            if (hash) {
                tocLinks.forEach(function(link) {
                    link.classList.toggle('active', link.getAttribute('href') === hash)
                })
            }
            if (!hash && tocLinks.length > 0) {
                tocLinks[0].classList.add('active')
            }
        }, 150)

        updateActiveTOC()
    }
}

document.addEventListener('DOMContentLoaded', generateTOC)