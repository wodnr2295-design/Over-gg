/* ==========================================================================
   views/board.js — 공략 · 파티/길드 모집 보드 (localStorage 연동)
   ========================================================================== */
(function (window) {
  "use strict";

  const OGG = (window.OGG = window.OGG || {});
  const U = OGG.util;
  const KEY = "ogg.board.v1";

  const CATS = [
    { id: "all", label: "전체", icon: "filter-list" },
    { id: "guide", label: "공략", icon: "book", cls: "cat-guide" },
    { id: "party", label: "파티 모집", icon: "party", cls: "cat-party" },
    { id: "guild", label: "길드", icon: "crown", cls: "cat-guild" },
    { id: "question", label: "질문", icon: "comment", cls: "cat-question" },
    { id: "free", label: "잡담", icon: "spark", cls: "cat-free" }
  ];

  let state = null;

  function store() {
    const raw = U.storeGet(KEY, null);
    if (!raw || typeof raw !== "object") return { posts: [], likes: {}, comments: {}, views: {}, nickname: "" };
    return {
      posts: Array.isArray(raw.posts) ? raw.posts : [],
      likes: raw.likes || {},
      comments: raw.comments || {},
      views: raw.views || {},
      nickname: raw.nickname || ""
    };
  }

  function persist(db) {
    U.storeSet(KEY, db);
  }

  function allPosts(data, db) {
    const seeds = data.boardSeed.map((p) => Object.assign({ seed: true }, p));
    const mine = db.posts.map((p) => Object.assign({ seed: false }, p));
    return mine.concat(seeds).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  function commentsOf(db, postId) {
    return db.comments[postId] || [];
  }

  function likesOf(db, post) {
    return (post.likes || 0) + (db.likes[post.id] ? 1 : 0);
  }

  function viewsOf(db, post) {
    return (post.views || 0) + (db.views[post.id] || 0);
  }

  function catOf(id) {
    return CATS.find((c) => c.id === id) || CATS[CATS.length - 1];
  }

  function filterPosts(data, db) {
    const list = allPosts(data, db).filter((p) => {
      if (state.cat !== "all" && p.category !== state.cat) return false;
      if (state.tag && !(p.tags || []).includes(state.tag)) return false;
      if (state.q) {
        const hay = [p.title, p.body, p.author, ...(p.tags || [])].join(" ").toLowerCase();
        if (!hay.includes(state.q.toLowerCase())) return false;
      }
      return true;
    });
    if (state.sort === "likes") list.sort((a, b) => likesOf(db, b) - likesOf(db, a));
    else if (state.sort === "comments") list.sort((a, b) => commentsOf(db, b.id).length - commentsOf(db, a.id).length);
    return list;
  }

  function catCounts(data, db) {
    const all = allPosts(data, db).filter((p) => (state.tag ? (p.tags || []).includes(state.tag) : true));
    const counts = { all: all.length };
    CATS.forEach((c) => {
      if (c.id === "all") return;
      counts[c.id] = all.filter((p) => p.category === c.id).length;
    });
    return counts;
  }

  /* ------------------------------------------------------------- list */
  function row(db, p) {
    const cat = catOf(p.category);
    const commentCount = (p.comments ? p.comments.length : 0) + commentsOf(db, p.id).length;
    return `
      <button class="post-row" type="button" data-post="${U.esc(p.id)}">
        <span class="pcat ${cat.cls || "cat-free"}">${U.icon(cat.icon)}</span>
        <span class="post-main">
          <span class="post-title">
            ${p.seed ? "" : `<span class="badge badge-soft-gold" style="font-size:9px;padding:1px 5px">내 글</span>`}
            ${U.esc(p.title)}
            ${commentCount ? `<span class="mono" style="color:var(--gold);font-size:11px">[${commentCount}]</span>` : ""}
          </span>
          <span class="post-excerpt">${U.esc(String(p.body || "").replace(/\s+/g, " ").slice(0, 110))}</span>
          <span class="post-tags">
            ${(p.tags || []).slice(0, 4).map((t) => `<span class="post-tag" data-tag="${U.esc(t)}">#${U.esc(t)}</span>`).join("")}
            ${p.seed ? `<span class="post-tag" style="color:var(--text-4)">예시 글</span>` : ""}
          </span>
        </span>
        <span class="post-meta">
          <span class="pm">${U.icon("user")}${U.esc(p.author)}</span>
          <span class="pm">${U.icon("clock")}${U.timeAgo(p.createdAt)}</span>
          <span class="pm">${U.icon("heart")}${U.num(likesOf(db, p))}</span>
          <span class="pm">${U.icon("eye")}${U.num(viewsOf(db, p))}</span>
        </span>
      </button>`;
  }

  function listView(data, db) {
    const list = filterPosts(data, db);
    const counts = catCounts(data, db);
    return `
      <div class="stack" style="gap:16px">
        <div class="board-toolbar">
          <div class="board-tabs" role="tablist" aria-label="게시판 분류">
            ${CATS.map(
              (c) =>
                `<button class="board-tab ${state.cat === c.id ? "is-active" : ""}" type="button" data-cat="${c.id}" role="tab" aria-selected="${state.cat === c.id}">
                  ${U.esc(c.label)} <span class="cnt">${counts[c.id] || 0}</span>
                </button>`
            ).join("")}
          </div>
          <div class="board-toolbar-top">
            <div class="search-field">
              ${U.icon("search")}
              <input type="search" id="boardSearch" placeholder="제목 · 내용 · 태그 검색" value="${U.esc(state.q)}" autocomplete="off" />
              <button class="clear ${state.q ? "" : "hidden"}" type="button" id="boardClear" aria-label="검색어 지우기">${U.icon("x")}</button>
            </div>
            <select class="select" id="boardSort" aria-label="정렬">
              <option value="latest" ${state.sort === "latest" ? "selected" : ""}>최신순</option>
              <option value="likes" ${state.sort === "likes" ? "selected" : ""}>추천순</option>
              <option value="comments" ${state.sort === "comments" ? "selected" : ""}>댓글순</option>
            </select>
            <button class="btn btn-primary btn-sm" type="button" data-compose="1">${U.icon("pen")}글쓰기</button>
          </div>
          ${
            state.tag
              ? `<div class="row-wrap" style="gap:8px">
                  <span class="filter-label">태그</span>
                  <button class="chip is-active" type="button" data-clear-tag>#${U.esc(state.tag)} ${U.icon("x")}</button>
                </div>`
              : ""
          }
        </div>

        <div class="result-line">
          <span>글 <b>${list.length}</b>개</span>
          <span class="tiny dim">${U.icon("info")} 예시 글 + 이 브라우저에 저장된 내 글</span>
        </div>

        <div class="post-list" id="postList">
          ${list.length ? list.map((p) => row(db, p)).join("") : `<div class="empty">${U.icon("board")}<b>조건에 맞는 글이 없습니다</b><span>검색어를 지우거나 첫 글을 작성해 보세요.</span><button class="btn btn-primary btn-sm" type="button" data-compose="1">${U.icon("pen")}글쓰기</button></div>`}
        </div>

        <div class="notice notice-info">
          ${U.icon("info")}
          <span>
            이 게시판은 <b>프로토타입</b>입니다. 작성한 글·댓글은 서버가 아닌 <b>이 브라우저(localStorage)</b>에만 저장되며,
            '예시 글' 표시가 있는 글은 사이트 제작이 작성한 샘플입니다.
          </span>
        </div>
      </div>`;
  }

  /* ----------------------------------------------------------- compose */
  function composeView(data, db) {
    return `
      <div class="stack" style="gap:16px">
        <div class="row" style="gap:10px">
          <button class="btn btn-ghost btn-sm" type="button" data-back>${U.icon("chevron-right", "flip-x")}목록으로</button>
          <span class="spacer"></span>
          <span class="badge badge-ghost">localStorage 저장</span>
        </div>
        <div class="card">
          <div class="card-head">
            <h3>${U.icon("pen")}새 글 작성</h3>
            <span class="tiny dim">공략 · 파티 모집 · 길드 · 질문 · 잡담</span>
          </div>
          <div class="card-body">
            <form class="form-grid" id="composeForm" novalidate>
              <div class="field">
                <label>분류 <span class="req">*</span></label>
                <div class="board-tabs" id="catPicker">
                  ${CATS.filter((c) => c.id !== "all")
                    .map(
                      (c) =>
                        `<button class="board-tab ${state.composeCat === c.id ? "is-active" : ""}" type="button" data-pick-cat="${c.id}">${U.esc(c.label)}</button>`
                    )
                    .join("")}
                </div>
              </div>
              <div class="field">
                <label for="postTitle">제목 <span class="req">*</span></label>
                <input class="input" id="postTitle" name="title" maxlength="80" placeholder="예: 인마대전 20시 파티 모집 (대검 자리)" />
                <span class="field-error">제목을 4자 이상 입력해 주세요.</span>
                <span class="counter" id="titleCounter">0 / 80</span>
              </div>
              <div class="field">
                <label for="postBody">내용 <span class="req">*</span></label>
                <textarea class="textarea" id="postBody" name="body" maxlength="4000" placeholder="확인된 정보와 본인 경험을 구분해서 적어 주세요.&#10;예: 공식 공지로 확인된 내용 — 파브라늄은 장비 분해·강화 실패로 획득.&#10;제 경험 — 초반에는 무기 슬롯을 먼저 올리는 편이 좋았습니다."></textarea>
                <span class="field-error">내용을 10자 이상 입력해 주세요.</span>
                <span class="counter" id="bodyCounter">0 / 4000</span>
              </div>
              <div class="field">
                <label for="postTags">태그 <span class="dim" style="font-weight:400">(쉼표로 구분, 최대 5개)</span></label>
                <input class="input" id="postTags" name="tags" placeholder="예: 인마대전, 파티모집, 대검" />
              </div>
              <div class="field">
                <label for="postAuthor">닉네임 <span class="req">*</span></label>
                <input class="input" id="postAuthor" name="author" maxlength="16" value="${U.esc(db.nickname || "익명의 대장장이")}" />
                <span class="help">닉네임은 이 브라우저에 기억됩니다.</span>
                <span class="field-error">닉네임을 2자 이상 입력해 주세요.</span>
              </div>
              <div class="row-wrap" style="gap:8px;justify-content:flex-end">
                <button class="btn btn-ghost" type="button" data-back>취소</button>
                <button class="btn btn-primary" type="submit">${U.icon("check")}등록하기</button>
              </div>
            </form>
          </div>
        </div>
      </div>`;
  }

  /* ------------------------------------------------------------ detail */
  function detailView(data, db, postId) {
    const all = allPosts(data, db);
    const post = all.find((p) => p.id === postId);
    if (!post) {
      return `<div class="empty">${U.icon("alert")}<b>글을 찾을 수 없습니다</b><span>목록으로 돌아가 다시 선택해 주세요.</span><button class="btn btn-primary btn-sm" type="button" data-back>목록으로</button></div>`;
    }
    const cat = catOf(post.category);
    const liked = !!db.likes[post.id];
    const comments = commentsOf(db, post.id);
    const seedComments = post.comments || [];
    const total = seedComments.length + comments.length;

    return `
      <div class="stack" style="gap:16px">
        <div class="row" style="gap:10px">
          <button class="btn btn-ghost btn-sm" type="button" data-back>${U.icon("chevron-right", "flip-x")}목록으로</button>
          <span class="spacer"></span>
          ${post.seed ? `<span class="badge badge-ghost">예시 글</span>` : `<span class="badge badge-soft-gold">내 글</span>`}
          ${!post.seed ? `<button class="btn btn-ghost btn-sm" type="button" data-delete-post="${U.esc(post.id)}">${U.icon("x")}삭제</button>` : ""}
        </div>

        <article class="card">
          <div class="card-body stack">
            <div class="pd-head">
              <div class="row-wrap" style="gap:8px">
                <span class="badge ${cat.cls || "cat-free"}">${U.icon(cat.icon)}${U.esc(cat.label)}</span>
                ${(post.tags || []).map((t) => `<button class="post-tag" type="button" data-tag="${U.esc(t)}">#${U.esc(t)}</button>`).join("")}
              </div>
              <h2 class="pd-title">${U.esc(post.title)}</h2>
              <div class="pd-meta">
                <span class="author"><span class="avatar">${U.esc((post.author || "?").slice(0, 1))}</span>${U.esc(post.author || "익명")}</span>
                <span>${U.formatDate(post.createdAt, true)} · ${U.timeAgo(post.createdAt)}</span>
                <span class="pm">${U.icon("eye")}${U.num(viewsOf(db, post))}</span>
                <span class="pm">${U.icon("heart")}${U.num(likesOf(db, post))}</span>
                <span class="pm">${U.icon("comment")}${total}</span>
              </div>
            </div>

            <div class="pd-body">${String(post.body || "")
              .split(/\n{2,}/)
              .map((p) => `<p>${U.esc(p)}</p>`)
              .join("")}</div>

            <div class="pd-actions">
              <button class="react-btn ${liked ? "is-on" : ""}" type="button" data-like="${U.esc(post.id)}">
                ${U.icon("heart")}추천 <b class="mono">${U.num(likesOf(db, post))}</b>
              </button>
              <button class="react-btn" type="button" data-copy-link="${U.esc(post.id)}">${U.icon("link")}링크 복사</button>
              <span class="spacer"></span>
              <span class="tiny dim">${post.seed ? "사이트 제작이 작성한 예시 글" : "브라우저에 저장된 글"}</span>
            </div>
          </div>
        </article>

        <section class="card">
          <div class="card-head">
            <h3>${U.icon("comment")}댓글 <span class="mono" style="color:var(--gold)">${total}</span></h3>
            <span class="tiny dim">이 브라우저에 저장</span>
          </div>
          <div class="card-body stack">
            <div class="comments">
              ${seedComments.map((c) => commentItem(c)).join("")}
              ${comments.map((c) => commentItem(c)).join("")}
              ${total === 0 ? `<div class="tiny dim">첫 댓글을 남겨 보세요.</div>` : ""}
            </div>
            <form class="comment-form" id="commentForm" data-post-id="${U.esc(post.id)}">
              <div class="field">
                <label for="commentBody" class="sr-only">댓글 내용</label>
                <textarea class="textarea" id="commentBody" maxlength="500" style="min-height:82px" placeholder="댓글을 입력하세요 (최대 500자)"></textarea>
              </div>
              <div class="row-wrap" style="justify-content:space-between">
                <label class="tiny dim" style="display:flex;align-items:center;gap:7px">닉네임
                  <input class="input" id="commentAuthor" maxlength="16" style="max-width:180px" value="${U.esc(db.nickname || "익명의 대장장이")}" />
                </label>
                <button class="btn btn-primary btn-sm" type="submit">${U.icon("comment")}댓글 등록</button>
              </div>
            </form>
          </div>
        </section>
      </div>`;
  }

  function commentItem(c) {
    return `
      <div class="comment">
        <div class="comment-head">
          <span class="avatar" style="width:20px;height:20px;font-size:9px">${U.esc((c.author || "?").slice(0, 1))}</span>
          <b>${U.esc(c.author || "익명")}</b>
          <span>${U.timeAgo(c.createdAt)}</span>
        </div>
        <p>${U.esc(c.body)}</p>
      </div>`;
  }

  /* ------------------------------------------------------------- render */
  function render(data, params) {
    const db = store();
    const postId = (params && params.get && params.get("post")) || "";
    const tag = (params && params.get && params.get("tag")) || "";
    state = {
      db,
      cat: (params && params.get && params.get("cat")) || "all",
      q: "",
      sort: "latest",
      tag: tag,
      compose: false,
      composeCat: "guide",
      postId
    };
    if (state.cat === "all" && tag) {
      /* keep all categories when arriving from a tag chip */
    }

    return `
      <div class="stack" style="gap:20px">
        <section class="section">
          <div class="section-head">
            <div class="titles">
              <span class="eyebrow">Community Board</span>
              <h2 class="section-title">공략 · 파티 · 길드 보드</h2>
              <p class="section-desc">태그로 찾고, 직접 글을 써 보세요. 모집 글에는 무기 계열과 시간대를 적으면 매칭이 빠릅니다.</p>
            </div>
            <div class="row-wrap" style="gap:8px">
              <span class="badge badge-ghost">${U.icon("users")}예시 글 ${data.boardSeed.length}</span>
              <span class="badge badge-ghost">${U.icon("save")}내 글 ${db.posts.length}</span>
            </div>
          </div>
          <div id="boardRoot">${state.compose ? composeView(data, db) : state.postId ? detailView(data, db, state.postId) : listView(data, db)}</div>
        </section>
      </div>`;
  }

  function rerender(root, data) {
    const target = root.querySelector("#boardRoot");
    if (!target) return;
    const db = store();
    state.db = db;
    target.innerHTML = state.compose
      ? composeView(data, db)
      : state.postId
      ? detailView(data, db, state.postId)
      : listView(data, db);
    if (!state.compose && !state.postId) {
      const search = target.querySelector("#boardSearch");
      if (search && state.q) {
        search.focus();
        search.setSelectionRange(state.q.length, state.q.length);
      }
    }
  }

  /* -------------------------------------------------------------- mount */
  function mount(root, data) {
    const go = (hash) => {
      window.location.hash = hash;
    };

    U.on(root, "click", "[data-compose]", function () {
      state.compose = true;
      state.postId = "";
      rerender(root, data);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    U.on(root, "click", "[data-back]", function () {
      state.compose = false;
      state.postId = "";
      go("#/board");
      rerender(root, data);
    });

    U.on(root, "click", "[data-post]", function (event, el) {
      const id = el.getAttribute("data-post");
      state.postId = id;
      state.compose = false;
      const db = store();
      db.views[id] = (db.views[id] || 0) + 1;
      persist(db);
      go(`#/board?post=${encodeURIComponent(id)}`);
      rerender(root, data);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    U.on(root, "click", "[data-cat]", function (event, el) {
      state.cat = el.getAttribute("data-cat");
      state.postId = "";
      rerender(root, data);
    });

    U.on(root, "click", "[data-clear-tag]", function () {
      state.tag = "";
      go("#/board");
      rerender(root, data);
    });

    U.on(root, "click", "[data-tag]", function (event, el) {
      event.stopPropagation();
      const tag = el.getAttribute("data-tag");
      state.tag = tag;
      state.postId = "";
      state.compose = false;
      go(`#/board?tag=${encodeURIComponent(tag)}`);
      rerender(root, data);
    });

    U.on(root, "click", "[data-pick-cat]", function (event, el) {
      state.composeCat = el.getAttribute("data-pick-cat");
      U.qsa("[data-pick-cat]", root).forEach((b) => b.classList.toggle("is-active", b === el));
    });

    U.on(root, "input", "#boardSearch", function (event, el) {
      state.q = el.value.trim();
      const list = filterPosts(data, store());
      const wrap = root.querySelector("#postList");
      const clear = root.querySelector("#boardClear");
      if (wrap) {
        const db = store();
        wrap.innerHTML = list.length
          ? list.map((p) => row(db, p)).join("")
          : `<div class="empty">${U.icon("search")}<b>검색 결과가 없습니다</b><span>다른 키워드를 입력해 보세요.</span></div>`;
      }
      if (clear) clear.classList.toggle("hidden", !state.q);
    });

    U.on(root, "click", "#boardClear", function () {
      state.q = "";
      rerender(root, data);
    });

    U.on(root, "change", "#boardSort", function (event, el) {
      state.sort = el.value;
      rerender(root, data);
    });

    U.on(root, "input", "#postTitle", function (event, el) {
      const c = root.querySelector("#titleCounter");
      if (c) c.textContent = `${el.value.length} / 80`;
    });
    U.on(root, "input", "#postBody", function (event, el) {
      const c = root.querySelector("#bodyCounter");
      if (c) c.textContent = `${el.value.length} / 4000`;
    });

    U.on(root, "submit", "#composeForm", function (event, form) {
      event.preventDefault();
      const title = form.querySelector("#postTitle");
      const body = form.querySelector("#postBody");
      const author = form.querySelector("#postAuthor");
      const tags = form.querySelector("#postTags");
      let ok = true;

      const setError = (input, bad) => {
        const field = input.closest(".field");
        if (field) field.classList.toggle("has-error", bad);
        if (bad) ok = false;
      };
      setError(title, title.value.trim().length < 4);
      setError(body, body.value.trim().length < 10);
      setError(author, author.value.trim().length < 2);
      if (!ok) {
        U.toast("입력하지 않은 항목이 있습니다", "alert");
        return;
      }

      const db = store();
      const tagList = tags.value
        .split(",")
        .map((t) => t.trim().replace(/^#/, ""))
        .filter(Boolean)
        .slice(0, 5);
      const post = {
        id: `u-${Date.now()}`,
        category: state.composeCat,
        title: title.value.trim(),
        body: body.value.trim(),
        tags: tagList,
        author: author.value.trim(),
        createdAt: new Date().toISOString(),
        likes: 0,
        views: 0,
        comments: []
      };
      db.posts.unshift(post);
      db.nickname = author.value.trim();
      persist(db);
      state.compose = false;
      state.postId = post.id;
      state.db = db;
      go(`#/board?post=${encodeURIComponent(post.id)}`);
      rerender(root, data);
      window.scrollTo({ top: 0, behavior: "smooth" });
      U.toast("글을 등록했습니다 (이 브라우저에 저장)", "check");
    });


    U.on(root, "click", "[data-like]", function (event, el) {
      const id = el.getAttribute("data-like");
      const db = store();
      if (db.likes[id]) delete db.likes[id];
      else db.likes[id] = true;
      persist(db);
      rerender(root, data);
      U.toast(db.likes[id] ? "추천했습니다" : "추천을 취소했습니다", "heart");
    });

    U.on(root, "click", "[data-copy-link]", function (event, el) {
      const id = el.getAttribute("data-copy-link");
      const url = `${window.location.origin}${window.location.pathname}#/board?post=${encodeURIComponent(id)}`;
      U.copyText(url).then((ok) => U.toast(ok ? "링크를 복사했습니다" : "복사에 실패했습니다", ok ? "link" : "alert"));
    });

    U.on(root, "click", "[data-delete-post]", function (event, el) {
      const id = el.getAttribute("data-delete-post");
      if (!window.confirm("이 글을 삭제할까요? 되돌릴 수 없습니다.")) return;
      const db = store();
      db.posts = db.posts.filter((p) => p.id !== id);
      delete db.comments[id];
      delete db.likes[id];
      delete db.views[id];
      persist(db);
      state.postId = "";
      go("#/board");
      rerender(root, data);
      U.toast("글을 삭제했습니다", "x");
    });

    U.on(root, "submit", "#commentForm", function (event, form) {
      event.preventDefault();
      const postId = form.getAttribute("data-post-id");
      const bodyEl = form.querySelector("#commentBody");
      const authorEl = form.querySelector("#commentAuthor");
      const text = bodyEl.value.trim();
      if (text.length < 2) {
        U.toast("댓글을 2자 이상 입력해 주세요", "alert");
        bodyEl.focus();
        return;
      }
      const db = store();
      if (!db.comments[postId]) db.comments[postId] = [];
      db.comments[postId].push({
        author: (authorEl.value.trim() || "익명의 대장장이").slice(0, 16),
        body: text,
        createdAt: new Date().toISOString()
      });
      db.nickname = authorEl.value.trim() || db.nickname;
      persist(db);
      rerender(root, data);
      U.toast("댓글을 등록했습니다", "comment");
    });
  }

  OGG.views = OGG.views || {};
  OGG.views.board = { render, mount };
})(window);
