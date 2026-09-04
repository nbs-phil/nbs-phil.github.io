/**
 * Site renderer — loads content.yaml and builds the page.
 *
 * Data flow:
 *   content.yaml  →  loadSite()  →  renderSite()  →  initInteractions()
 *
 * To change layout or styling, edit css/style.css (not this file).
 * To change content, edit content.yaml (not content.md — that file is unused).
 *
 * After editing JS or CSS, bump the ?v= query in index.html so browsers
 * pick up the new file (cache busting).
 */

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

/** Add https:// to bare domains; block unsafe schemes. */
function normalizeHref(href) {
  const trimmed = href.trim();
  if (!trimmed || /^(javascript:|data:|file:)/i.test(trimmed)) {
    return null;
  }
  if (/^(https?:|mailto:)/i.test(trimmed)) {
    return trimmed;
  }
  if (trimmed.startsWith("//")) {
    return `https:${trimmed}`;
  }
  return `https://${trimmed.replace(/^\/+/, "")}`;
}

const INLINE_LINK_RE = /^<a\s+href="([^"]+)">([\s\S]*?)<\/a>/i;
const INLINE_EM_RE = /^<(?:em|i)>([\s\S]*?)<\/(?:em|i)>/i;

function findInlineToken(text) {
  const candidates = [];

  const linkIndex = text.search(/<a\s+href="/i);
  if (linkIndex !== -1) {
    const match = text.slice(linkIndex).match(INLINE_LINK_RE);
    if (match) {
      candidates.push({ type: "link", index: linkIndex, match, full: match[0] });
    }
  }

  const emIndex = text.search(/<(?:em|i)>/i);
  if (emIndex !== -1) {
    const match = text.slice(emIndex).match(INLINE_EM_RE);
    if (match) {
      candidates.push({ type: "em", index: emIndex, match, full: match[0] });
    }
  }

  if (!candidates.length) {
    return null;
  }

  candidates.sort((a, b) => a.index - b.index);
  return candidates[0];
}

/**
 * Escape text but render safe inline markup from content.yaml:
 *   <a href="...">...</a>  <em>...</em>  <i>...</i>
 * Tags can nest (e.g. italic text containing a link).
 */
function formatInlineText(text) {
  let result = "";
  let remaining = text;

  while (remaining.length) {
    const token = findInlineToken(remaining);
    if (!token) {
      result += escapeHtml(remaining);
      break;
    }

    result += escapeHtml(remaining.slice(0, token.index));

    if (token.type === "link") {
      const href = normalizeHref(token.match[1]);
      const inner = formatInlineText(token.match[2]);
      if (href) {
        result += `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${inner}</a>`;
      } else {
        result += escapeHtml(token.full);
      }
    } else {
      result += `<em>${formatInlineText(token.match[1])}</em>`;
    }

    remaining = remaining.slice(token.index + token.full.length);
  }

  return result;
}

/** Split block text on blank lines into <p> tags. Used for abstracts. */
function paragraphsHtml(text) {
  return text
    .trim()
    .split(/\n\s*\n/)
    .map((p) => `<p>${formatInlineText(p.trim())}</p>`)
    .join("");
}

function renderPaperTitle(paper) {
  const title = escapeHtml(paper.title);
  if (paper.link) {
    return `<a class="paper-link" href="${escapeHtml(paper.link)}" target="_blank" rel="noopener noreferrer">${title}</a>`;
  }
  return `<span class="paper-title-text">${title}</span>`;
}

/** One illustration with optional caption. Images must be PNG/JPG/SVG paths. */
function renderFigure(figure) {
  if (!figure) {
    return "";
  }

  const caption = figure.caption
    ? `<figcaption class="caption">${escapeHtml(figure.caption)}</figcaption>`
    : "";

  return `
    <figure class="project-figure">
      <img
        src="${escapeHtml(figure.src)}"
        alt="${escapeHtml(figure.alt || "")}"
      >
      ${caption}
    </figure>
  `;
}

/**
 * Gather all figures for a project into one list for the right column.
 *
 * Supports in content.yaml:
 *   - project.figure   (single object)
 *   - project.figures  (array — use this for multiple project-level images)
 *   - paper.figure / paper.figures on each paper (appended after project figures)
 *
 * Order: project figure(s) first, then paper figures in papers[] order.
 */
function collectProjectFigures(project) {
  const figures = [];

  if (project.figures) {
    figures.push(...project.figures);
  } else if (project.figure) {
    figures.push(project.figure);
  }

  (project.papers || []).forEach((paper) => {
    if (paper.figures) {
      figures.push(...paper.figures);
    } else if (paper.figure) {
      figures.push(paper.figure);
    }
  });

  return figures;
}

/** Sticky right column of stacked figures beside project text. */
function renderProjectFigures(project) {
  const figures = collectProjectFigures(project);

  if (!figures.length) {
    return "";
  }

  return `
    <div class="project-figures">
      ${figures.map((figure) => renderFigure(figure)).join("")}
    </div>
  `;
}

/** One paper row: title, venue, collapsible abstract (figures live in project column). */
function renderPaper(paper, projectIndex, paperIndex) {
  const expandableId = `paper-${projectIndex}-${paperIndex}-expandable`;
  const venue = paper.venue
    ? `<p class="paper-venue">${formatInlineText(paper.venue)}</p>`
    : "";

  return `
    <article class="paper-item">
      ${renderPaperTitle(paper)}
      ${venue}
      <button
        class="abstract-toggle"
        type="button"
        aria-expanded="false"
        aria-controls="${expandableId}"
      >
        <span class="toggle-label">Abstract</span>
        <span class="toggle-icon" aria-hidden="true"></span>
      </button>
      <div id="${expandableId}" class="paper-expandable" hidden>
        <div class="abstract-panel">
          ${paragraphsHtml(paper.abstract || "")}
        </div>
      </div>
    </article>
  `;
}

/** One project: click title to expand abstract, papers, and figures. */
function renderProject(project, index) {
  const projectId = `project-${index}`;
  const papers = (project.papers || [])
    .map((paper, paperIndex) => renderPaper(paper, index, paperIndex))
    .join("");

  const figureColumn = renderProjectFigures(project);

  return `
    <article class="project-item">
      <button
        class="project-toggle"
        type="button"
        aria-expanded="false"
        aria-controls="${projectId}"
      >
        <span class="project-toggle-title">${escapeHtml(project.title)}</span>
        <span class="toggle-icon" aria-hidden="true"></span>
      </button>

      <div id="${projectId}" class="project-panel" hidden>
        <div class="project-layout">
          <div class="project-main">
            <div class="project-abstract">
              ${paragraphsHtml(project.abstract || "")}
            </div>

            ${
              papers
                ? `<div class="paper-list">
                    ${papers}
                  </div>`
                : ""
            }
          </div>
          ${figureColumn}
        </div>
      </div>
    </article>
  `;
}

/** Fortune-cookie image + caption — rendered after the project list. */
function renderCookieBlock(summaryImage) {
  if (!summaryImage) {
    return "";
  }

  const caption = summaryImage.caption
    ? `<figcaption class="cookie-caption">${escapeHtml(summaryImage.caption.trim().replace(/\s*\n+\s*/g, " "))}</figcaption>`
    : "";

  return `
    <figure class="cookie-figure">
      <img
        src="${escapeHtml(summaryImage.src)}"
        alt="${escapeHtml(summaryImage.alt || "")}"
        width="640"
        height="200"
      >
      ${caption}
    </figure>
  `;
}

/** Map content.yaml sections to the three DOM containers in index.html. */
function renderSite(data) {
  const { site, research, projects } = data;

  document.title = `${site.name} — Academic Portfolio`;
  document.querySelector('meta[name="description"]').content = site.description;

  document.getElementById("bio-section").innerHTML = `
    <div class="bio-header">
      <h1 class="name">${escapeHtml(site.name)}</h1>
      <ul class="contact-links">
        <li><a href="mailto:${escapeHtml(site.email)}">Email</a></li>
        <li><a href="${escapeHtml(site.philpeople)}" target="_blank" rel="noopener noreferrer">PhilPeople</a></li>
      </ul>
    </div>
    <div class="bio">
      ${site.bio.map((p) => `<p>${formatInlineText(p.trim())}</p>`).join("")}
    </div>
  `;

  document.getElementById("research-section").innerHTML = `
    <h2 class="research-heading">${escapeHtml(research.heading)}</h2>
    <div class="project-list">
      ${projects.map((project, index) => renderProject(project, index)).join("")}
    </div>
  `;

  document.getElementById("cookie-section").innerHTML =
    renderCookieBlock(research.summary_image);

  document.getElementById("footer-text").innerHTML = `
    Last updated ${escapeHtml(site.footer_updated)}.
  `;
}

/** Generic expand/collapse for elements with aria-controls + hidden panel. */
function setupToggle(buttonSelector, onToggle) {
  document.querySelectorAll(buttonSelector).forEach((button) => {
    const panelId = button.getAttribute("aria-controls");
    const panel = document.getElementById(panelId);

    button.addEventListener("click", () => {
      const isExpanded = button.getAttribute("aria-expanded") === "true";
      const nextExpanded = !isExpanded;

      button.setAttribute("aria-expanded", String(nextExpanded));
      panel.hidden = !nextExpanded;

      if (onToggle) {
        onToggle(button, nextExpanded);
      }
    });
  });
}

function initInteractions() {
  setupToggle(".project-toggle");
  setupToggle(".abstract-toggle", (button, expanded) => {
    const label = button.querySelector(".toggle-label");
    label.textContent = expanded ? "Hide abstract" : "Abstract";
  });
}

async function loadSite() {
  const response = await fetch("content.yaml");
  if (!response.ok) {
    throw new Error(`Could not load content.yaml (${response.status})`);
  }

  const data = jsyaml.load(await response.text());
  renderSite(data);
  initInteractions();
}

document.addEventListener("DOMContentLoaded", () => {
  loadSite().catch((error) => {
    console.error(error);
    document.body.insertAdjacentHTML(
      "afterbegin",
      `<p style="padding:1rem;background:#fee;color:#900;">Failed to load content.yaml. ${escapeHtml(error.message)}</p>`
    );
  });
});
