// This is the master function called by the background script
// It's exposed to the window object so the injected script from background.js can call it.
window.toggleOverlay = function() {
    const existingOverlay = document.querySelector('.article-overlay');
    if (existingOverlay) {
        hideOverlay();
    } else {
        createOverlay();
    }
};

// Check for instant mode on page load
chrome.storage.sync.get('instantMode', (data) => {
    if (data.instantMode) {
        // Use a small delay to ensure the page is fully loaded and ready
        setTimeout(window.toggleOverlay, 500);
    }
});

function detectDirection(text) {
    const rtlChars = /[\u0591-\u07FF\u200F\u202B\u202E\uFB1D-\uFDFF\uFE70-\uFEFF]/;
    return rtlChars.test(text) ? 'rtl' : 'ltr';
}

function extractArticles() {
    let articles = [];
    // The specific structure for the user's site is a.title followed by content elements.
    const titleElements = document.querySelectorAll('a.title');

    if (titleElements.length > 0) {
        titleElements.forEach(titleAnchor => {
            const title = titleAnchor.querySelector('h2')?.textContent.trim() || '';
            let content = '';
            let images = [];
            let currentNode = titleAnchor.nextElementSibling;

            // Iterate through siblings until we hit the next article title or run out of elements.
            while (currentNode && (!currentNode.matches('a.title'))) {
                if (currentNode.tagName === 'P') {
                    // Preserve the inner HTML to keep links and other formatting
                    content += currentNode.innerHTML.trim() + '\n\n';
                } else if (currentNode.matches('.wp-caption')) { // Specific class for image containers
                    const img = currentNode.querySelector('img');
                    if (img && img.src) {
                        images.push({
                            src: img.src,
                            alt: img.alt || '',
                            aspectRatio: img.width / img.height
                        });
                    }
                }
                currentNode = currentNode.nextElementSibling;
            }
            if (content.trim() || images.length > 0) {
                articles.push({ title, content: content.trim(), images });
            }
        });
    } 
    
    // If the specific logic finds nothing, fall back to a general single-page extractor.
    if (articles.length === 0) {
        const mainElement = document.querySelector('article, .content, main') || document.body;
        const pageTitle = document.querySelector('h1')?.textContent.trim() || document.title;
        // Get paragraph content with HTML preserved
        const pageContent = Array.from(mainElement.querySelectorAll('p'))
            .map(p => p.innerHTML.trim())
            .filter(Boolean)
            .join('\n\n');
        const pageImages = Array.from(mainElement.querySelectorAll('img'))
            .filter(img => img.src && img.width > 100 && img.height > 100)
            .map(img => ({ src: img.src, alt: img.alt || '', aspectRatio: img.width / img.height }));

        if (pageContent || pageImages.length > 0) {
            articles.push({ title: pageTitle, content: pageContent, images: pageImages });
        }
    }

    return articles;
}

async function createOverlay() {
    const articles = extractArticles();
    if (articles.length === 0) {
        alert('Easy Reader could not find any readable content on this page.');
        return;
    }

    const overallDirection = detectDirection(articles.map(a => a.title + a.content).join(' '));
    
    // Get the fullscreen mode setting
    const { fullscreenMode } = await chrome.storage.sync.get('fullscreenMode');

    const articlesHtml = articles.map(article => {
        article.images.sort((a, b) => b.aspectRatio - a.aspectRatio);
        const imageHtml = article.images.map(img =>
            `<img src="${img.src}" alt="${img.alt}" class="overlay-image">`
        ).join('');

        return `
            <div class="article-section">
                ${article.title ? `<h2 class="article-title">${article.title}</h2>` : ''}
                ${imageHtml ? `<div class="image-grid">${imageHtml}</div>` : ''}
                <div class="overlay-text">${article.content.split('\n\n').map(para => `<p>${para}</p>`).join('')}</div>
            </div>
        `;
    }).join('<hr class="article-separator">');

    const overlay = document.createElement('div');
    overlay.className = 'article-overlay';
    if (fullscreenMode) {
        overlay.classList.add('fullscreen-mode');
    }
    
    overlay.innerHTML = `
    <div class="overlay-content" dir="${overallDirection}">
        <div class="overlay-header">
            <h1 class="overlay-title">Easy Reader</h1>
            <button class="overlay-close">×</button>
        </div>
        <div class="overlay-body" dir="auto">${articlesHtml}</div>
    </div>`;

    document.body.appendChild(overlay);

    overlay.querySelector('.overlay-close').onclick = hideOverlay;
    overlay.onclick = (e) => {
        if (e.target === overlay) hideOverlay();
    };

    // Add keyboard event listener for ESC key
    document.addEventListener('keydown', handleKeyDown);
    
    // Prevent body scrolling when overlay is active in fullscreen mode
    if (fullscreenMode) {
        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = 'hidden';
    }

    setTimeout(() => overlay.classList.add('visible'), 10);
}

function handleKeyDown(e) {
    if (e.key === 'Escape') {
        hideOverlay();
    }
}

function hideOverlay() {
    const overlay = document.querySelector('.article-overlay');
    if (!overlay) return;

    // Restore body scrolling
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
    
    overlay.classList.remove('visible');
    document.removeEventListener('keydown', handleKeyDown);
    
    setTimeout(() => {
        if (overlay) overlay.remove();
    }, 300); // Match transition duration in styles.css
}

chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'showOverlay') {
        createOverlay();
    } else if (message.action === 'hideOverlay') {
        hideOverlay();
    } else if (message.action === 'toggleOverlay') {
        window.toggleOverlay();
    }
});
