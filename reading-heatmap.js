// DOM 캐시와 상태를 분리해 두면 아래 함수들이 깔끔해진다.
const dom = {
    total: document.getElementById('total-books'),
    heatmap: document.getElementById('reading-heatmap'),
    list: document.getElementById('books-list')
};

const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
const seasonEmojis = {
    3: '🌸',
    6: '☀️',
    9: '🍂',
    12: '❄️'
};
const state = {
    books: [],
    booksByYear: new Map(),
    heatmapBuckets: new Map()
};

document.addEventListener('DOMContentLoaded', init);

async function init() {
    try {
        const csv = await fetch('books.csv').then(res => res.text());
        state.books = parseCSV(csv).sort(sortBooksDesc);
        buildDerivedData();
        renderHeatmap();
        renderBookColumns();
        dom.total.textContent = `총 ${state.books.length}권의 책을 읽었어요`;
    } catch (error) {
        console.error('CSV를 불러오는 중 문제가 발생했습니다.', error);
        dom.total.textContent = '데이터를 불러오지 못했어요.';
    }
}

function parseCSV(text) {
    const [headerLine, ...rows] = text.trim().split('\n');
    const headers = headerLine.split(',');
    return rows.reduce((acc, line) => {
        if (!line.trim()) return acc;
        const cols = line.split(',');
        const entry = {};
        headers.forEach((header, index) => {
            let value = cols[index] ?? '';
            if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
            entry[header] = header === 'year' || header === 'month'
                ? parseInt(value, 10) || 0
                : value.trim();
        });
        if (entry.title && entry.year && entry.month) acc.push(entry);
        return acc;
    }, []);
}

function sortBooksDesc(a, b) {
    if (a.year !== b.year) return b.year - a.year;
    if (a.month !== b.month) return b.month - a.month;
    return a.title.localeCompare(b.title);
}

function buildDerivedData() {
    state.booksByYear = new Map();
    state.heatmapBuckets = new Map();

    state.books.forEach(book => {
        const yearBucket = state.booksByYear.get(book.year) ?? [];
        yearBucket.push(book);
        state.booksByYear.set(book.year, yearBucket);

        const key = monthKey(book.year, book.month);
        const monthly = state.heatmapBuckets.get(key) ?? [];
        monthly.push(book);
        state.heatmapBuckets.set(key, monthly);
    });

    state.booksByYear.forEach(list => list.sort((a, b) => b.month - a.month || a.title.localeCompare(b.title)));
}

function renderHeatmap() {
    dom.heatmap.innerHTML = '';
    if (state.books.length === 0) {
        dom.heatmap.textContent = '표시할 데이터가 없어요.';
        return;
    }

    const yearsWithData = Array.from(state.booksByYear.keys()).sort((a, b) => a - b);
    const currentYear = new Date().getFullYear();
    const minYear = Math.min(...yearsWithData, currentYear);
    const maxYear = Math.max(...yearsWithData, currentYear);
    const now = new Date();

    const years = [];
    for (let year = minYear; year <= maxYear; year++) {
        years.push(year);
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'heatmap-grid';

    const yearRow = document.createElement('div');
    yearRow.className = 'heatmap-year-row';
    const topSpacer = document.createElement('div');
    topSpacer.className = 'row-spacer';
    yearRow.appendChild(topSpacer);
    years.forEach(year => {
        const label = document.createElement('div');
        label.className = 'year-label';
        label.textContent = year;
        yearRow.appendChild(label);
    });

    const columnsWrapper = document.createElement('div');
    columnsWrapper.className = 'heatmap-columns';

    const monthLabels = document.createElement('div');
    monthLabels.className = 'month-labels';
    monthNames.forEach((name, index) => {
        const label = document.createElement('div');
        const monthNumber = index + 1;
        const emoji = seasonEmojis[monthNumber];
        label.innerHTML = emoji ? `<span class="season-emoji" aria-hidden="true">${emoji}</span>${name}` : name;
        label.setAttribute('data-month', monthNumber);
        monthLabels.appendChild(label);
    });
    columnsWrapper.appendChild(monthLabels);

    years.forEach(year => {
        const column = document.createElement('div');
        column.className = 'heatmap-column';

        for (let month = 1; month <= 12; month++) {
            const cell = document.createElement('div');
            cell.className = 'heatmap-cell';

            const isFuture = year > now.getFullYear() || (year === now.getFullYear() && month > now.getMonth() + 1);
            if (isFuture) {
                cell.style.visibility = 'hidden';
            } else {
                const monthBooks = getBooksForMonth(year, month);
                const count = monthBooks.length;
                if (count > 0) {
                    cell.classList.add(`level-${Math.min(count, 4)}`);
                    cell.addEventListener('mouseenter', () => showBookList(cell, monthBooks, year, monthNames[month - 1]));
                    cell.addEventListener('mouseleave', hideBookList);
                }
                cell.title = `${year}년 ${month}월: ${count}권`;
            }

            column.appendChild(cell);
        }

        columnsWrapper.appendChild(column);
    });

    const totalsRow = document.createElement('div');
    totalsRow.className = 'year-totals-row';
    const bottomSpacer = document.createElement('div');
    bottomSpacer.className = 'row-spacer';
    totalsRow.appendChild(bottomSpacer);

    years.forEach(year => {
        const totalCell = document.createElement('div');
        totalCell.className = 'year-total';
        const total = state.booksByYear.get(year)?.length ?? 0;
        if (total) {
            totalCell.textContent = total;
        }
        totalsRow.appendChild(totalCell);
    });

    wrapper.appendChild(yearRow);
    wrapper.appendChild(columnsWrapper);
    wrapper.appendChild(totalsRow);
    dom.heatmap.appendChild(wrapper);
}

function renderBookColumns() {
    dom.list.innerHTML = '';
    if (state.books.length === 0) return;

    const currentYear = new Date().getFullYear();
    const currentColumn = createColumn();
    const pastColumn = createColumn();

    Array.from(state.booksByYear.keys())
        .sort((a, b) => b - a)
        .forEach(year => {
            const target = year === currentYear ? currentColumn : pastColumn;
            target.appendChild(createYearSection(year, year === currentYear));
        });

    if (currentColumn.childElementCount) dom.list.appendChild(currentColumn);
    if (pastColumn.childElementCount) dom.list.appendChild(pastColumn);
}

function createColumn() {
    const column = document.createElement('div');
    column.className = 'books-column';
    return column;
}

function createYearSection(year, isCurrentYear) {
    const fragment = document.createDocumentFragment();
    const header = document.createElement('h2');
    header.textContent = isCurrentYear ? `${year} (올해)` : year;
    fragment.appendChild(header);

    const list = document.createElement('ul');
    (state.booksByYear.get(year) || []).forEach(book => {
        const item = document.createElement('li');
        const monthSpan = document.createElement('span');
        monthSpan.className = 'month';
        monthSpan.textContent = `${book.month}월`;

        const titleSpan = document.createElement('span');
        titleSpan.textContent = book.title;

        item.appendChild(monthSpan);
        item.appendChild(titleSpan);
        list.appendChild(item);
    });

    fragment.appendChild(list);
    return fragment;
}

function monthKey(year, month) {
    return `${year}-${String(month).padStart(2, '0')}`;
}

function getBooksForMonth(year, month) {
    return state.heatmapBuckets.get(monthKey(year, month)) || [];
}

function showBookList(cell, books, year, monthLabel) {
    hideBookList();
    if (!books.length) return;

    const tooltip = document.createElement('div');
    tooltip.className = 'book-tooltip';
    tooltip.innerHTML = `
        <div class="tooltip-header">${year}년 ${monthLabel} · ${books.length}권</div>
        <div class="tooltip-content">
            ${books.map(book => `<div class="tooltip-book">• ${book.title}</div>`).join('')}
        </div>
    `;

    const rect = cell.getBoundingClientRect();
    let left = rect.left;
    let top = rect.bottom + 6;
    const tooltipWidth = 240;
    const tooltipHeight = Math.min(books.length * 18 + 60, 220);

    if (left + tooltipWidth > window.innerWidth) left = window.innerWidth - tooltipWidth - 12;
    if (top + tooltipHeight > window.innerHeight) top = rect.top - tooltipHeight - 6;

    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
    document.body.appendChild(tooltip);
}

function hideBookList() {
    document.querySelector('.book-tooltip')?.remove();
}
