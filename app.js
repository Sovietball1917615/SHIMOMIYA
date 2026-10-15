const videos = [
  {
    title: "夜明けの海沿いを、ただ歩くだけ。",
    creator: "kaho film",
    avatar: "k",
    avatarColor: "#d8e5df",
    category: "日常",
    views: "12.4K",
    comments: "328",
    likes: 156,
    duration: "08:42",
    image: "photo-1500375592092-40eb2168fd21",
  },
  {
    title: "このコード進行、ずっと聴いていたい。",
    creator: "mugi sounds",
    avatar: "m",
    avatarColor: "#edd9d2",
    category: "音楽",
    views: "8,902",
    comments: "219",
    likes: 201,
    duration: "03:18",
    image: "photo-1511379938547-c1f69419868d",
  },
  {
    title: "喫茶店のプリンを、家でも作りたくて。",
    creator: "おやつ日記",
    avatar: "お",
    avatarColor: "#f0e2bb",
    category: "料理",
    views: "7,610",
    comments: "184",
    likes: 178,
    duration: "12:06",
    image: "photo-1488477181946-6428a0291777",
  },
  {
    title: "初見でこのステージ行けると思わないじゃん",
    creator: "natsu game",
    avatar: "n",
    avatarColor: "#d9ddf0",
    category: "ゲーム",
    views: "19.1K",
    comments: "642",
    likes: 512,
    duration: "16:51",
    image: "photo-1542751371-adc38448a05e",
  },
  {
    title: "雨の日の散歩、音だけ集めてみました。",
    creator: "sora no oto",
    avatar: "s",
    avatarColor: "#dce9ed",
    category: "日常",
    views: "5,208",
    comments: "97",
    likes: 84,
    duration: "05:27",
    image: "photo-1519608487953-e999c86e7455",
  },
  {
    title: "絵が動き出すまでの30秒。",
    creator: "poco studio",
    avatar: "p",
    avatarColor: "#e8dcef",
    category: "アニメーション",
    views: "11.7K",
    comments: "403",
    likes: 366,
    duration: "00:30",
    image: "photo-1513364776144-60967b0f800f",
  },
  {
    title: "帰り道に見つけた、春の色。",
    creator: "kaho film",
    avatar: "k",
    avatarColor: "#d8e5df",
    category: "日常",
    views: "4,822",
    comments: "113",
    likes: 109,
    duration: "04:12",
    image: "photo-1490750967868-88aa4486c946",
  },
  {
    title: "休日の朝に聴く、ピアノの小品。",
    creator: "mugi sounds",
    avatar: "m",
    avatarColor: "#edd9d2",
    category: "音楽",
    views: "6,350",
    comments: "152",
    likes: 143,
    duration: "02:55",
    image: "photo-1520523839897-bd0b52f945a0",
  },
  {
    title: "じっくり煮込んだ週末のカレー。",
    creator: "おやつ日記",
    avatar: "お",
    avatarColor: "#f0e2bb",
    category: "料理",
    views: "9,104",
    comments: "268",
    likes: 249,
    duration: "10:14",
    image: "photo-1603894584373-5ac82b2ae398",
  },
];

const messages = [
  { user: "mio", text: "この朝の空気感すき", color: "#e8d8ed", commentColor: "color-pink" },
  { user: "つき", text: "わかる、深呼吸したくなる", color: "#dce8dd" },
  { user: "ao", text: "ここで一回止めて見ちゃった", color: "#dce4f0", commentColor: "color-blue" },
  { user: "こめ", text: "花びらきれい！", color: "#f2e7ce", commentColor: "color-yellow" },
  { user: "yuki", text: "なんか今日もがんばれそう", color: "#e8ded7" },
  { user: "nana", text: "音と映像が心地いいなあ", color: "#eadde4", commentColor: "color-green" },
  { user: "rin", text: "この場所行ってみたい", color: "#dfebeb" },
  { user: "sumi", text: "ずっと見ていられる", color: "#eee3d1", commentColor: "color-yellow" },
];

const grid = document.querySelector("#video-grid");
const searchInput = document.querySelector("#search-input");
const commentLayer = document.querySelector("#comment-layer");
const chatList = document.querySelector("#chat-list");
const toast = document.querySelector("#toast");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
let selectedCategory = "すべて";
let sortOrder = "popular";
let toastTimeout;
let currentLikes = 248;
let currentUser = null;
let remoteVideos = [];
let supabaseClient = null;

const supabaseConfig = window.SHIMOMIYA_SUPABASE_CONFIG || {};
const supabaseConfigured = Boolean(supabaseConfig.url && supabaseConfig.anonKey);
const supabaseReady = Boolean(supabaseConfigured && window.supabase?.createClient);
if (supabaseReady) {
  supabaseClient = window.supabase.createClient(supabaseConfig.url, supabaseConfig.anonKey);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

function imageUrl(photoId, width = 700) {
  return `https://images.unsplash.com/${photoId}?auto=format&fit=crop&w=${width}&q=80`;
}

function viewCount(video) {
  const count = Number(video.views.replace(",", "").replace("K", ""));
  return video.views.includes("K") ? count * 1000 : count;
}

function allVideos() {
  return [...videos, ...remoteVideos];
}

function renderVideos() {
  const query = searchInput.value.trim().toLocaleLowerCase("ja");
  const filteredVideos = allVideos().filter((video) => {
    const matchesCategory = selectedCategory === "すべて" || video.category === selectedCategory;
    const searchableText = `${video.title} ${video.creator} ${video.category}`.toLocaleLowerCase("ja");
    return matchesCategory && searchableText.includes(query);
  });
  filteredVideos.sort((first, second) => sortOrder === "popular"
    ? viewCount(second) - viewCount(first)
    : new Date(second.created_at || 0) - new Date(first.created_at || 0));

  grid.innerHTML = filteredVideos.map((video, index) => `
    <article class="video-card" tabindex="0" role="button" aria-label="${escapeHtml(video.title)} を再生" data-video-index="${index}">
      <div class="card-thumbnail">
        <img src="${imageUrl(video.image)}" alt="" loading="lazy" />
        <span class="card-comment-count">◌ ${video.comments}</span>
        <span class="card-duration">${video.duration}</span>
        ${video.isRemote ? '<span class="card-upload-label">投稿動画</span>' : ""}
      </div>
      <div class="card-meta">
        <span class="creator-avatar" style="background:${escapeHtml(video.avatarColor)}">${escapeHtml(video.avatar)}</span>
        <div class="card-copy">
          <h3>${escapeHtml(video.title)}</h3>
          <p>${escapeHtml(video.creator)} · ${escapeHtml(video.views)} 回視聴</p>
          <p><span class="category-label">#${escapeHtml(video.category)}</span> · ${video.isRemote ? new Date(video.created_at).toLocaleDateString("ja-JP") : "2日前"}</p>
        </div>
      </div>
    </article>
  `).join("");

  document.querySelector("#empty-state").hidden = filteredVideos.length > 0;
  grid.hidden = filteredVideos.length === 0;
  grid.querySelectorAll(".video-card").forEach((card) => {
    card.addEventListener("click", () => playVideo(filteredVideos[Number(card.dataset.videoIndex)]));
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        card.click();
      }
    });
  });
}

function playVideo(video) {
  const player = document.querySelector("#main-video");
  const source = player.querySelector("source");
  source.src = video.video_url || "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";
  player.load();
  player.poster = imageUrl(video.image, 1400);
  document.querySelector(".video-category").textContent = `CATEGORY · ${video.category}`;
  document.querySelector(".video-title-block h3").textContent = video.title;
  document.querySelector(".video-title-block p").textContent = `${video.creator} · ${video.views} 回視聴${video.description ? ` · ${video.description}` : ""}`;
  currentLikes = video.likes;
  document.querySelector("#like-button").setAttribute("aria-pressed", "false");
  document.querySelector("#like-button").classList.remove("liked");
  document.querySelector("#like-count").textContent = String(currentLikes);
  document.querySelector("#comment-count").textContent = Number(video.comments).toLocaleString("ja-JP");
  document.querySelector("#watch-section").hidden = false;
  document.querySelector("#watch-section").scrollIntoView({ behavior: reducedMotion.matches ? "auto" : "smooth" });
  player.play().catch(() => showToast("再生できませんでした。プレイヤーから再生してください"));
}

async function loadRemoteVideos() {
  const { data, error } = await supabaseClient
    .from("videos")
    .select("id, owner_id, title, description, category, video_path, created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;

  remoteVideos = data.map((video) => {
    const { data: publicUrl } = supabaseClient.storage.from("videos").getPublicUrl(video.video_path);
    return {
      id: video.id,
      title: video.title,
      description: video.description,
      creator: `SHIMOMIYA user ${video.owner_id.slice(0, 6)}`,
      avatar: "S",
      avatarColor: "#eadde4",
      category: video.category,
      views: "0",
      comments: "0",
      likes: 0,
      duration: "VIDEO",
      image: "photo-1470252649378-9c29740c9fa8",
      video_url: publicUrl.publicUrl,
      created_at: video.created_at,
      isRemote: true,
    };
  });
  renderVideos();
}

function renderChatMessage(message) {
  const item = document.createElement("div");
  item.className = "chat-message";
  const avatar = document.createElement("span");
  avatar.className = "chat-avatar";
  avatar.style.backgroundColor = message.color;
  avatar.textContent = message.user.slice(0, 1);
  const body = document.createElement("div");
  body.className = "chat-message-body";
  const user = document.createElement("span");
  user.className = "chat-user";
  user.textContent = message.user;
  const text = document.createElement("p");
  text.className = "chat-text";
  text.textContent = message.text;
  body.append(user, text);
  item.append(avatar, body);
  chatList.append(item);
  while (chatList.children.length > 18) chatList.firstElementChild.remove();
  chatList.scrollTop = chatList.scrollHeight;
}

function launchComment(message, { color, user = message } = {}) {
  const comment = document.createElement("span");
  comment.className = `floating-comment ${color || ""}`.trim();
  comment.textContent = message;
  comment.style.top = `${8 + Math.random() * 75}%`;
  comment.style.setProperty("--duration", `${reducedMotion.matches ? 4 : 9 + Math.random() * 6}s`);
  commentLayer.append(comment);
  comment.addEventListener("animationend", () => comment.remove(), { once: true });
  if (user) renderChatMessage({ user, text: message, color: "#f0e1d7" });
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("visible");
  window.clearTimeout(toastTimeout);
  toastTimeout = window.setTimeout(() => toast.classList.remove("visible"), 2300);
}

function updateAccountUI() {
  const accountButton = document.querySelector("#account-button");
  if (currentUser) {
    accountButton.textContent = (currentUser.email || "U").slice(0, 1).toUpperCase();
    accountButton.setAttribute("aria-label", `ログイン中: ${currentUser.email}（ログアウト）`);
    document.querySelector("#connection-status").textContent = "Supabaseに接続中 · 動画投稿できます";
  } else if (supabaseReady) {
    accountButton.textContent = "m";
    accountButton.setAttribute("aria-label", "ログイン");
    document.querySelector("#connection-status").textContent = "Supabaseに接続済み · ログインして動画を投稿";
  } else {
    accountButton.textContent = "m";
    accountButton.setAttribute("aria-label", "Supabaseの設定が必要です");
    document.querySelector("#connection-status").textContent = supabaseConfigured
      ? "Supabase SDKを読み込めません。インターネット接続を確認してください"
      : "Supabase未設定 · READMEの設定手順を確認してください";
  }
}

let authMode = "login";
let uploadAfterLogin = false;
function openAuthDialog(forUpload = false) {
  if (!supabaseReady) {
    showToast(supabaseConfigured
      ? "Supabase SDKを読み込めません。インターネット接続を確認してください"
      : "先にsupabase-config.jsへSupabase URLとanon keyを設定してください");
    return;
  }
  uploadAfterLogin = forUpload;
  authMode = "login";
  document.querySelector("#auth-error").textContent = "";
  document.querySelector("#auth-form").reset();
  document.querySelector("#auth-title").textContent = "アカウントにログイン";
  document.querySelector("#auth-description").textContent = "ログインすると動画を投稿できます。";
  document.querySelector("#auth-submit").textContent = "ログイン";
  document.querySelector("#auth-switch").textContent = "アカウントを作成";
  document.querySelector("#auth-dialog").showModal();
}

async function uploadVideo(event) {
  event.preventDefault();
  const fileInput = document.querySelector("#upload-file");
  const file = fileInput.files[0];
  const title = document.querySelector("#upload-title-input").value.trim();
  const errorMessage = document.querySelector("#upload-error");
  const submitButton = document.querySelector("#upload-submit");
  const allowedTypes = ["video/mp4", "video/webm", "video/quicktime"];
  errorMessage.textContent = "";

  if (!currentUser) {
    errorMessage.textContent = "投稿するにはログインしてください。";
    return;
  }
  if (!file || !allowedTypes.includes(file.type)) {
    errorMessage.textContent = "MP4、WebM、MOV形式の動画を選択してください。";
    return;
  }
  if (file.size > 100 * 1024 * 1024) {
    errorMessage.textContent = "動画ファイルは100MB以下にしてください。";
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = "アップロード中…";
  try {
    const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100);
    const objectId = crypto.randomUUID();
    const path = `${currentUser.id}/${objectId}-${safeFileName}`;
    const { error: storageError } = await supabaseClient.storage
      .from("videos")
      .upload(path, file, { contentType: file.type, cacheControl: "3600", upsert: false });
    if (storageError) throw storageError;

    const { error: metadataError } = await supabaseClient.from("videos").insert({
      owner_id: currentUser.id,
      title,
      description: document.querySelector("#upload-description-input").value.trim(),
      category: document.querySelector("#upload-category").value,
      video_path: path,
    });
    if (metadataError) {
      const { error: cleanupError } = await supabaseClient.storage.from("videos").remove([path]);
      if (cleanupError) {
        throw new Error(`${metadataError.message} (アップロード済みファイルの削除にも失敗しました: ${cleanupError.message})`);
      }
      throw metadataError;
    }

    await loadRemoteVideos();
    document.querySelector("#upload-dialog").close();
    document.querySelector("#upload-form").reset();
    showToast("動画をSupabaseに保存して公開しました");
  } catch (error) {
    errorMessage.textContent = `アップロードに失敗しました: ${error.message}`;
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "アップロード";
  }
}

function selectCategory(category) {
  selectedCategory = category;
  document.querySelectorAll(".pill").forEach((pill) => pill.classList.toggle("active", pill.dataset.category === category));
  document.querySelectorAll(".category-link").forEach((link) => link.classList.toggle("active", link.dataset.category === category));
  document.querySelector("#feed-title").textContent = category === "すべて" ? "あなたへのおすすめ" : `${category}の動画`;
  renderVideos();
}

messages.forEach((message, index) => {
  window.setTimeout(() => {
    renderChatMessage(message);
    launchComment(message.text, { color: message.commentColor, user: null });
  }, index * 420);
});

window.setInterval(() => {
  if (document.hidden) return;
  const message = messages[Math.floor(Math.random() * messages.length)];
  launchComment(message.text, { color: message.commentColor, user: message.user });
}, 3600);

document.querySelector("#comment-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const input = document.querySelector("#comment-input");
  const text = input.value.trim();
  if (!text) {
    input.focus();
    return;
  }
  launchComment(text, { color: "color-yellow", user: "me" });
  document.querySelector("#comment-count").textContent = (Number(document.querySelector("#comment-count").textContent.replace(",", "")) + 1).toLocaleString("ja-JP");
  input.value = "";
});

document.querySelector("#toggle-comments").addEventListener("click", (event) => {
  const button = event.currentTarget;
  const visible = button.getAttribute("aria-pressed") !== "true";
  button.setAttribute("aria-pressed", String(visible));
  commentLayer.hidden = !visible;
  button.firstChild.textContent = visible ? "コメントを非表示 " : "コメントを表示 ";
});

document.querySelector("#like-button").addEventListener("click", (event) => {
  const button = event.currentTarget;
  const liked = button.getAttribute("aria-pressed") === "true";
  button.setAttribute("aria-pressed", String(!liked));
  button.classList.toggle("liked", !liked);
  document.querySelector("#like-count").textContent = String(currentLikes + (liked ? 0 : 1));
});

document.querySelector("#search-form").addEventListener("submit", (event) => {
  event.preventDefault();
  document.querySelector("#feed-section").scrollIntoView({ behavior: reducedMotion.matches ? "auto" : "smooth" });
  renderVideos();
});
searchInput.addEventListener("input", renderVideos);
document.querySelectorAll(".pill").forEach((pill) => pill.addEventListener("click", () => selectCategory(pill.dataset.category)));
document.querySelectorAll(".category-link").forEach((link) => link.addEventListener("click", () => {
  selectCategory(link.dataset.category);
  document.querySelector("#feed-section").scrollIntoView({ behavior: reducedMotion.matches ? "auto" : "smooth" });
}));

document.querySelectorAll(".nav-link[data-view]").forEach((link) => link.addEventListener("click", () => {
  document.querySelectorAll(".nav-link[data-view]").forEach((item) => item.classList.toggle("active", item === link));
  sortOrder = link.dataset.view === "新着動画" ? "newest" : "popular";
  document.querySelector("#feed-title").textContent = link.dataset.view === "おすすめ" ? "あなたへのおすすめ" : link.dataset.view;
  document.querySelector("#sort-button").innerHTML = sortOrder === "popular" ? '人気順 <span aria-hidden="true">⌄</span>' : '新着順 <span aria-hidden="true">⌄</span>';
  renderVideos();
  if (link.dataset.view === "新着動画") showToast("新着動画を表示しています");
  if (link.dataset.view === "ランキング") showToast("今週のランキングを表示しています");
  document.querySelector("#feed-section").scrollIntoView({ behavior: reducedMotion.matches ? "auto" : "smooth" });
}));

document.querySelector("#hero-play").addEventListener("click", () => {
  playVideo({
    title: "朝の光と、花のある暮らし。｜週末の小さな記録",
    creator: "SHIMOMIYA pick",
    views: "12.8K",
    comments: "1,284",
    likes: 248,
    image: "photo-1470252649378-9c29740c9fa8",
    category: "日常 · 風景",
  });
});

document.querySelector("#close-player").addEventListener("click", () => {
  document.querySelector("#watch-section").hidden = true;
  showToast("プレイヤーを閉じました");
});

document.querySelector("#upload-button").addEventListener("click", () => {
  if (currentUser) {
    document.querySelector("#upload-error").textContent = "";
    document.querySelector("#upload-dialog").showModal();
  } else {
    openAuthDialog(true);
  }
});
document.querySelector("#account-button").addEventListener("click", () => {
  if (!currentUser) {
    openAuthDialog();
    return;
  }
  supabaseClient.auth.signOut().then(({ error }) => {
    if (error) showToast(`ログアウトに失敗しました: ${error.message}`);
    else showToast("ログアウトしました");
  });
});
document.querySelector("#auth-switch").addEventListener("click", (event) => {
  authMode = authMode === "login" ? "signup" : "login";
  document.querySelector("#auth-error").textContent = "";
  document.querySelector("#auth-title").textContent = authMode === "login" ? "アカウントにログイン" : "アカウントを作成";
  document.querySelector("#auth-description").textContent = authMode === "login" ? "ログインすると動画を投稿できます。" : "メールアドレスと6文字以上のパスワードを入力してください。";
  document.querySelector("#auth-submit").textContent = authMode === "login" ? "ログイン" : "新規登録";
  event.currentTarget.textContent = authMode === "login" ? "アカウントを作成" : "ログインに戻る";
});
document.querySelector("#auth-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const errorMessage = document.querySelector("#auth-error");
  const submitButton = document.querySelector("#auth-submit");
  const email = document.querySelector("#auth-email").value.trim();
  const password = document.querySelector("#auth-password").value;
  errorMessage.textContent = "";
  submitButton.disabled = true;
  try {
    if (authMode === "login") {
      const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (error) throw error;
      document.querySelector("#auth-dialog").close();
      if (uploadAfterLogin) document.querySelector("#upload-dialog").showModal();
      showToast("ログインしました");
    } else {
      const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.href.split("#")[0] },
      });
      if (error) throw error;
      if (data.session) {
        document.querySelector("#auth-dialog").close();
        if (uploadAfterLogin) document.querySelector("#upload-dialog").showModal();
      } else {
        errorMessage.textContent = "確認メールを送信しました。メール内のリンクから登録を完了してください。";
      }
    }
  } catch (error) {
    errorMessage.textContent = `認証に失敗しました: ${error.message}`;
  } finally {
    submitButton.disabled = false;
  }
});
document.querySelector("#upload-form").addEventListener("submit", uploadVideo);
document.querySelectorAll("[data-close-dialog]").forEach((button) => button.addEventListener("click", () => button.closest("dialog").close()));
document.querySelectorAll(".app-dialog").forEach((dialog) => dialog.addEventListener("click", (event) => {
  if (event.target === dialog) dialog.close();
}));
document.querySelector("#sort-button").addEventListener("click", (event) => {
  sortOrder = sortOrder === "popular" ? "newest" : "popular";
  event.currentTarget.innerHTML = sortOrder === "popular" ? '人気順 <span aria-hidden="true">⌄</span>' : '新着順 <span aria-hidden="true">⌄</span>';
  renderVideos();
});

if (supabaseReady) {
  document.querySelector("#connection-status").textContent = "Supabaseに接続中…";
  supabaseClient.auth.onAuthStateChange((_event, session) => {
    window.setTimeout(() => {
      currentUser = session?.user || null;
      updateAccountUI();
      loadRemoteVideos().catch((error) => {
        document.querySelector("#connection-status").textContent = `動画の読み込みに失敗: ${error.message}`;
      });
    }, 0);
  });
  supabaseClient.auth.getSession().then(({ data, error }) => {
    if (error) {
      document.querySelector("#connection-status").textContent = `Supabase認証エラー: ${error.message}`;
      return;
    }
    currentUser = data.session?.user || null;
    updateAccountUI();
    loadRemoteVideos().catch((loadError) => {
      document.querySelector("#connection-status").textContent = `動画の読み込みに失敗: ${loadError.message}`;
    });
  });
} else {
  updateAccountUI();
}

document.addEventListener("keydown", (event) => {
  if (event.key === "/" && !["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)) {
    event.preventDefault();
    searchInput.focus();
  }
  if (event.key === "Escape" && document.activeElement === searchInput) {
    searchInput.value = "";
    renderVideos();
    searchInput.blur();
  }
});

renderVideos();
