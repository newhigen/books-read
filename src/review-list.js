import {
    parseFrontMatter,
    deriveTitleFromFilename,
    deriveDateFromFilename,
    derivePermalinkFromFilename,
    formatRelativeDate,
    extractMarkdownLinks,
    createEl,
    initTheme
} from './utils.js';

document.addEventListener('DOMContentLoaded', initReviewsList);

async function initReviewsList() {
    initTheme('theme-toggle');
    const container = document.getElementById('reviews-list');
    if (!container) return;

    const reviews = await loadReviews();
    renderList(container, reviews);
}

async function loadReviews() {
    const files = await discoverReviewFiles();
    if (!files.length) return [];
    const metadata = await Promise.all(files.map(fetchReviewMetadata));
    return metadata.filter(Boolean).sort((a, b) => new Date(b.date) - new Date(a.date));
}

async function discoverReviewFiles() {
    try {
        const response = await fetch('reviews/');
        if (!response.ok) return [];
        const html = await response.text();
        return extractMarkdownLinks(html);
    } catch {
        return [];
    }
}

async function fetchReviewMetadata(filename) {
    if (!filename) return null;
    try {
        const response = await fetch(`reviews/${encodeURIComponent(filename)}`);
        if (!response.ok) return null;
        const text = await response.text();
        const frontmatter = parseFrontMatter(text);
        const title = frontmatter.title || deriveTitleFromFilename(filename);
        const date = frontmatter.date || deriveDateFromFilename(filename);
        const permalink = frontmatter.permalink || derivePermalinkFromFilename(filename);
        if (!title || !date || !permalink) return null;
        return {
            title,
            date,
            url: `review-detail.html?file=${encodeURIComponent(filename)}`
        };
    } catch {
        return null;
    }
}

function renderList(container, reviews) {
    container.innerHTML = '';
    const list = document.createElement('ul');
    list.className = 'review-list reviews-archive-list';

    if (!reviews.length) {
        container.appendChild(createEl('p', 'heatmap-empty', '서평이 아직 없어요.'));
        return;
    }

    reviews.forEach(review => {
        const item = document.createElement('li');
        item.className = 'review-item reviews-archive-item';

        const link = document.createElement('a');
        link.className = 'review-title';
        link.href = review.url || `review-detail.html?file=${encodeURIComponent(review.filename)}`;
        link.textContent = review.title;

        const date = document.createElement('span');
        date.className = 'review-date reviews-archive-date';

        // Determine language from document
        const lang = (document.documentElement.lang || 'ko').startsWith('en') ? 'en' : 'ko';
        date.textContent = formatRelativeDate(review.date, lang);

        item.appendChild(link);
        item.appendChild(date);
        list.appendChild(item);
    });

    container.appendChild(list);
}
