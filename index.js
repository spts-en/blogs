const API_BASE = "";
let BLOGS = [];
let CURRENT_INDEX = 0;
let TEMPLATES = {};
const BATCH_SIZE = 6;

window.addEventListener("DOMContentLoaded", initialize);

async function initialize() {
    try {
        await loadMenu();

        const slug =
            new URLSearchParams(window.location.search)
                .get("slug");

        if (slug) {
            await loadSingleArticle(slug);
        } else {
            await loadBlogHome();
        }
    } catch (error) {
        renderError("Unable to load content.");
        console.error(error);
    }
}

async function fetchJson(url) {
    const response = await fetch(url, {
        headers: {
            Accept: "application/json"
        }
    });

    if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
    }

    return await response.json();
}

async function loadMenu() {
    try {
        const data = await fetchJson(`${API_BASE}menu.json`);

        document.getElementById("siteName").textContent =
            data.siteName || "Blog";

        document.getElementById("menu").innerHTML =
            (data.menus || [])
                .map(menu => `
                    <a href="${menu.url}">
                        ${sanitize(menu.label)}
                    </a>
                `)
                .join("");
    } catch (error) {
        console.error("Menu load failed:", error);
    }
}

async function loadBlogHome() {
    const [data, templatesData] = await Promise.all([
        fetchJson(`${API_BASE}blog-index.json`),
        fetchJson(`${API_BASE}templates.json`)
    ]);

    BLOGS = data.blogs || [];
    TEMPLATES = (templatesData.templates || []).reduce((map, template) => {
        map[template.name] = template;
        return map;
    }, {});

    document.getElementById("app").innerHTML =
        '<div id="blogGrid" class="blog-grid"></div>';

    renderNextBatch();
    setupInfiniteScroll();
}

function renderNextBatch() {
    const container = document.getElementById("blogGrid");
    const items = BLOGS.slice(
        CURRENT_INDEX,
        CURRENT_INDEX + BATCH_SIZE
    );

    items.forEach(blog => {
        container.insertAdjacentHTML(
            "beforeend",
            `
            <article class="blog-card">
                <img
                    loading="lazy"
                    src="${sanitize(blog.headerImage)}"
                    alt="${sanitize(blog.title)}"
                >
                <div class="blog-content">
                    <h2>
                        <a href="?slug=${encodeURIComponent(blog.slug)}">
                            ${sanitize(blog.title)}
                        </a>
                    </h2>
                    <div class="meta">
                        ${sanitize(blog.date)}
                    </div>
                    <p>
                        ${sanitize(blog.excerpt)}
                    </p>
                </div>
            </article>
            `
        );
    });

    CURRENT_INDEX += BATCH_SIZE;
}

function setupInfiniteScroll() {
    const trigger = document.getElementById("scrollTrigger");

    const observer = new IntersectionObserver(
        entries => {
            if (
                entries[0].isIntersecting &&
                CURRENT_INDEX < BLOGS.length
            ) {
                renderNextBatch();
            }
        },
        {
            rootMargin: "300px"
        }
    );

    observer.observe(trigger);
}

async function loadSingleArticle(slug) {
    try {
        const [blog, indexData] = await Promise.all([
            fetchJson(`${API_BASE}blogs/${encodeURIComponent(slug)}.json`),
            fetchJson(`${API_BASE}blog-index.json`)
        ]);

        const blogs = indexData.blogs || [];
        const currentIdx = blogs.findIndex(b => b.slug === slug);
        const prevBlog = currentIdx > 0 ? blogs[currentIdx - 1] : null;
        const nextBlog =
            currentIdx < blogs.length - 1
                ? blogs[currentIdx + 1]
                : null;

        renderArticle(blog, prevBlog, nextBlog);
    } catch (error) {
        console.error(error);
        document.getElementById("app").innerHTML =
            "<h1>Article Not Found</h1>";
    }
}

function getTemplateInfo(templateName) {
    return TEMPLATES[templateName] || {
        title: "Standard",
        description: "Standard article layout."
    };
}

function renderArticle(blog, prevBlog, nextBlog) {
    const template = getTemplateInfo(blog.template);
    const contentHtml = Array.isArray(blog.content)
        ? blog.content.map(renderBlock).join("")
        : "";

    const navHtml = `
        <div class="article-nav">
            ${prevBlog ? `
                <a href="?slug=${encodeURIComponent(prevBlog.slug)}" class="nav-button">
                    <div class="nav-label">← Previous</div>
                    <div>${sanitize(prevBlog.title)}</div>
                </a>
            ` : `
                <div class="nav-button disabled">
                    <div class="nav-label">← Previous</div>
                    <div>No previous article</div>
                </div>
            `}
            ${nextBlog ? `
                <a href="?slug=${encodeURIComponent(nextBlog.slug)}" class="nav-button">
                    <div class="nav-label">Next →</div>
                    <div>${sanitize(nextBlog.title)}</div>
                </a>
            ` : `
                <div class="nav-button disabled">
                    <div class="nav-label">Next →</div>
                    <div>No next article</div>
                </div>
            `}
        </div>
    `;

    document.getElementById("app").innerHTML = `
        <article class="article article--${sanitize(blog.template || "classic")}">
            <div class="article-header">
                <img
                    src="${sanitize(blog.headerImage)}"
                    alt="${sanitize(blog.title)}"
                >
                <h1>${sanitize(blog.title)}</h1>
                <div class="meta">
                    ${sanitize(blog.author || "")}
                    •
                    ${sanitize(blog.date || "")}
                </div>
                <div class="template-badge">
                    ${sanitize(template.title)}
                </div>
                <div class="template-description">
                    ${sanitize(template.description)}
                </div>
            </div>
            <div>
                ${contentHtml}
            </div>
            ${navHtml}
        </article>
    `;

    document.title = blog.title;
}

function renderBlock(block) {
    switch (block.type) {
        case "paragraph":
            return `<p>${sanitize(block.text)}</p>`;

        case "heading":
            return `<h${block.level || 2}>${sanitize(block.text)}</h${block.level || 2}>`;

        case "quote":
            return `
                <blockquote>
                    <p>${sanitize(block.text)}</p>
                    ${block.author ? `<p>— ${sanitize(block.author)}</p>` : ""}
                </blockquote>
            `;

        case "image":
            return `
                <figure>
                    <img
                        loading="lazy"
                        src="${sanitize(block.url)}"
                        alt="${sanitize(block.alt || "")}">
                    <figcaption>${sanitize(block.caption || "")}</figcaption>
                </figure>
            `;

        case "list":
            const tag = block.style === "ordered" ? "ol" : "ul";
            return `
                <${tag}>
                    ${Array.isArray(block.items)
                        ? block.items.map(item => `<li>${sanitize(item)}</li>`).join("")
                        : ""}
                </${tag}>
            `;

        case "code":
            return `
                <pre><code>${escapeHtml(block.content || "")}</code></pre>
            `;

        default:
            return "";
    }
}

function sanitize(value) {
    if (value == null) {
        return "";
    }

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function escapeHtml(value) {
    return sanitize(value)
        .replaceAll("\n", "\n");
}

function renderError(message) {
    document.getElementById("app").innerHTML =
        `<div class="loader">${sanitize(message)}</div>`;
}
