import {
    parseFrontMatter,
    deriveTitleFromFilename,
    deriveDateFromFilename,
    formatDate,
    escapeHtml
} from './utils.js';

document.addEventListener('DOMContentLoaded', initReviewPage);

async function initReviewPage() {
    const params = new URLSearchParams(window.location.search);
    const filename = params.get('file');
    if (!filename) {
        showError('파일을 찾을 수 없어요.');
        return;
    }

    let text = await fetchMarkdown(filename);
    if (!text) return;

    // Fix relative image paths
    text = text.replace(/\.\.\/assets\//g, 'assets/');

    const { body } = splitFrontMatter(text);
    const metadata = parseFrontMatter(text);
    renderHeader(metadata, filename);
    renderContent(body);
}

async function fetchMarkdown(filename) {
    try {
        const response = await fetch(`reviews/${encodeURIComponent(filename)}`);
        if (!response.ok) {
            showError('리뷰를 불러오지 못했어요.');
            return null;
        }
        return await response.text();
    } catch {
        showError('리뷰를 불러오지 못했어요.');
        return null;
    }
}

function splitFrontMatter(text) {
    const match = text.match(/^---\n([\s\S]*?)\n---\n?/);
    if (!match) return { frontmatter: '', body: text };
    return {
        frontmatter: match[1],
        body: text.slice(match[0].length)
    };
}

function renderHeader(meta, filename) {
    const title = meta.title || deriveTitleFromFilename(filename);
    const rawDate = meta.date || deriveDateFromFilename(filename);
    const formattedDate = formatDate(rawDate);
    document.title = title;
    setText('review-title', title);
    setText('review-date', formattedDate);
    const metaParts = [];
    if (meta.author) metaParts.push(meta.author);
    const publicationYear = meta.publication_year || meta.publicationYear;
    if (publicationYear) metaParts.push(publicationYear);
    if (metaParts.length) setText('review-meta', metaParts.join(' · '));
}

function renderContent(markdown) {
    const container = document.getElementById('review-content');
    container.innerHTML = markdownToHtml(markdown);
}

function markdownToHtml(markdown) {
    const lines = markdown.split('\n');
    const footnotes = {};
    const cleanLines = [];

    // Pass 1: Extract footnote definitions
    lines.forEach(line => {
        const match = line.match(/^\[\^(.+?)\]:\s+(.*)$/);
        if (match) {
            footnotes[match[1]] = match[2];
        } else {
            cleanLines.push(line);
        }
    });

    const html = [];
    let inCode = false;
    let codeLines = [];
    let listBuffer = [];

    const flushCode = () => {
        if (!inCode) return;
        html.push(`<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
        inCode = false;
        codeLines = [];
    };

    const flushList = () => {
        if (!listBuffer.length) return;
        const items = listBuffer.map(item => `<li>${item}</li>`).join('');
        html.push(`<ul>${items}</ul>`);
        listBuffer = [];
    };

    cleanLines.forEach(rawLine => {
        const line = rawLine.replace(/\r$/, '');

        if (/^```/.test(line)) {
            if (inCode) {
                flushCode();
            } else {
                inCode = true;
            }
            return;
        }

        if (inCode) {
            codeLines.push(line);
            return;
        }

        const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
        if (headingMatch) {
            flushList();
            const level = headingMatch[1].length;
            html.push(`<h${level}>${inlineMarkdown(headingMatch[2])}</h${level}>`);
            return;
        }

        const listMatch = line.match(/^[-*+]\s+(.*)$/);
        if (listMatch) {
            listBuffer.push(inlineMarkdown(listMatch[1]));
            return;
        } else {
            flushList();
        }

        if (!line.trim()) {
            return;
        }

        if (/^>/.test(line)) {
            html.push(`<blockquote>${inlineMarkdown(line.replace(/^>\s?/, ''))}</blockquote>`);
            return;
        }

        html.push(`<p>${inlineMarkdown(line)}</p>`);
    });

    flushList();
    flushCode();

    // Append Footnotes
    if (Object.keys(footnotes).length > 0) {
        html.push('<div class="footnotes"><hr><ol>');
        Object.keys(footnotes).forEach(key => {
            const def = inlineMarkdown(footnotes[key]);
            html.push(`<li id="fn-${key}">${def} <a href="#ref-${key}">↩</a></li>`);
        });
        html.push('</ol></div>');
    }

    return html.join('\n');
}

function inlineMarkdown(text) {
    let result = text;

    // Allow raw <img> tags: unescape them
    result = result.replace(/&lt;img (.*?)&gt;/g, '<img $1>');

    // Custom escaping: /< -> <, /> -> >
    result = result.replace(/\/&lt;/g, '<').replace(/\/&gt;/g, '>');

    // Images: ![alt](url)
    result = result.replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1">');

    // Footnote references: [^n] -> n (superscript)
    result = result.replace(/\[\^(.+?)\]/g, '<sup><a href="#fn-$1" id="ref-$1">$1</a></sup>');

    // Links: [text](url)
    result = result.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>');

    result = result.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    result = result.replace(/__(.+?)__/g, '<strong>$1</strong>');
    result = result.replace(/\*(.+?)\*/g, '<em>$1</em>');
    result = result.replace(/_(.+?)_/g, '<em>$1</em>');
    result = result.replace(/`([^`]+)`/g, '<code>$1</code>');
    return result;
}

function setText(id, value) {
    const el = document.getElementById(id);
    if (el && value) el.textContent = value;
}

function showError(message) {
    const el = document.getElementById('review-error');
    if (el) {
        el.textContent = message;
        el.style.display = 'block';
    }
}
