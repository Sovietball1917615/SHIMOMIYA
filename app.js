const grid = document.querySelector("#video-grid");
const searchInput = document.querySelector("#search-input");
const commentLayer = document.querySelector("#comment-layer");
const chatList = document.querySelector("#chat-list");
const toast = document.querySelector("#toast");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
let selectedCategory = "すべて";
let sortOrder = "popular";
let toastTimeout;
let currentLikes = 0;
let currentUser = null;
let currentProfile = null;
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
  return remoteVideos;
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
        <img src="${escapeHtml(video.thumbnail_url || imageUrl(video.image))}" alt="" loading="lazy" />
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
  document.querySelector("#empty-state").textContent = filteredVideos.length > 0
    ? ""
    : allVideos().length === 0
      ? "まだ動画がありません。最初の動画を投稿してみましょう。"
      : "該当する動画がありません。別のキーワードやカテゴリーを試してください。";
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
  if (!video?.video_url) {
    showToast("再生できる投稿動画がありません");
    return;
  }
  const player = document.querySelector("#main-video");
  const source = player.querySelector("source");
  source.src = video.video_url;
  player.load();
  commentLayer.replaceChildren();
  chatList.replaceChildren();
  document.querySelector("#chat-empty").hidden = false;
  player.poster = video.thumbnail_url || imageUrl(video.image, 1400);
  document.querySelector(".video-category").textContent = `CATEGORY · ${video.category}`;
  document.querySelector(".video-title-block h3").textContent = video.title;
  document.querySelector(".video-title-block p").textContent = `${video.creator} · ${video.views} 回視聴${video.description ? ` · ${video.description}` : ""}`;
  currentLikes = video.likes;
  document.querySelector("#like-button").setAttribute("aria-pressed", "false");
  document.querySelector("#like-button").classList.remove("liked");
  document.querySelector("#like-count").textContent = String(currentLikes);
  document.querySelector("#comment-count").textContent = Number(video.comments).toLocaleString("ja-JP");
  document.querySelector("#player-ratio").textContent = "—";
  document.querySelector("#player-current-time").textContent = "0:00";
  document.querySelector("#player-duration").textContent = "0:00";
  document.querySelector("#player-seek").value = "0";
  updatePlayerState();
  document.querySelector("#watch-section").hidden = false;
  document.querySelector("#watch-section").scrollIntoView({ behavior: reducedMotion.matches ? "auto" : "smooth" });
  player.play().catch(() => showToast("再生できませんでした。プレイヤーから再生してください"));
}

function formatPlayerTime(time) {
  if (!Number.isFinite(time)) return "0:00";
  const seconds = Math.floor(time);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = String(seconds % 60).padStart(2, "0");
  return hours ? `${hours}:${String(minutes).padStart(2, "0")}:${remainingSeconds}` : `${minutes}:${remainingSeconds}`;
}

function updatePlayerState() {
  const player = document.querySelector("#main-video");
  const frame = document.querySelector("#video-frame");
  frame.classList.toggle("is-playing", !player.paused && !player.ended);
  frame.classList.toggle("is-paused", player.paused || player.ended);
  frame.classList.toggle("is-muted", player.muted || player.volume === 0);
  document.querySelector("#player-play").setAttribute("aria-label", player.paused ? "再生" : "一時停止");
  document.querySelector("#player-center-play").setAttribute("aria-label", player.paused ? "再生" : "一時停止");
  document.querySelector("#player-mute").setAttribute("aria-label", player.muted || player.volume === 0 ? "音声をオン" : "ミュート");
}

function updatePlayerProgress() {
  const player = document.querySelector("#main-video");
  document.querySelector("#player-current-time").textContent = formatPlayerTime(player.currentTime);
  document.querySelector("#player-duration").textContent = formatPlayerTime(player.duration);
  document.querySelector("#player-seek").value = player.duration
    ? String(Math.round((player.currentTime / player.duration) * 1000))
    : "0";
}

function updateVideoDimensions() {
  const player = document.querySelector("#main-video");
  const frame = document.querySelector("#video-frame");
  if (!player.videoWidth || !player.videoHeight) return;

  const ratio = player.videoWidth / player.videoHeight;
  frame.style.setProperty("--video-ratio", `${player.videoWidth} / ${player.videoHeight}`);
  let commonRatio = `${player.videoWidth}:${player.videoHeight}`;
  if (Math.abs(ratio - 4 / 3) < 0.02) commonRatio = "4:3";
  else if (Math.abs(ratio - 1) < 0.02) commonRatio = "1:1";
  else if (Math.abs(ratio - 16 / 9) < 0.02) commonRatio = "16:9";
  else if (Math.abs(ratio - 9 / 16) < 0.02) commonRatio = "9:16";
  document.querySelector("#player-ratio").textContent = commonRatio;
}

async function togglePlayback() {
  const player = document.querySelector("#main-video");
  if (player.paused) {
    try {
      await player.play();
    } catch {
      showToast("この動画を再生できませんでした");
    }
  } else {
    player.pause();
  }
}

async function loadRemoteVideos() {
  const { data, error } = await supabaseClient
    .from("videos")
    .select("id, owner_id, title, description, category, video_path, thumbnail_path, created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;

  const ownerIds = [...new Set(data.map((video) => video.owner_id))];
  let profilesByUserId = new Map();
  if (ownerIds.length) {
    const { data: profiles, error: profilesError } = await supabaseClient
      .from("profiles")
      .select("user_id, display_name")
      .in("user_id", ownerIds);
    if (profilesError) throw profilesError;
    profilesByUserId = new Map(profiles.map((profile) => [profile.user_id, profile]));
  }

  remoteVideos = data.map((video) => {
    const { data: publicUrl } = supabaseClient.storage.from("videos").getPublicUrl(video.video_path);
    const { data: thumbnailUrl } = video.thumbnail_path
      ? supabaseClient.storage.from("videos").getPublicUrl(video.thumbnail_path)
      : { data: { publicUrl: null } };
    const profile = profilesByUserId.get(video.owner_id);
    return {
      id: video.id,
      title: video.title,
      description: video.description,
      creator: profile?.display_name || `SHIMOMIYA user ${video.owner_id.slice(0, 6)}`,
      avatar: (profile?.display_name || "S").slice(0, 1).toUpperCase(),
      avatarColor: "#eadde4",
      category: video.category,
      views: "0",
      comments: "0",
      likes: 0,
      duration: "VIDEO",
      image: "photo-1470252649378-9c29740c9fa8",
      video_url: publicUrl.publicUrl,
      thumbnail_url: thumbnailUrl.publicUrl,
      created_at: video.created_at,
      isRemote: true,
    };
  });
  document.querySelector("#connection-status").textContent = remoteVideos.length
    ? `${remoteVideos.length} 件の投稿動画`
    : "まだ動画がありません。最初の動画を投稿してください。";
  renderVideos();
  document.querySelector("#watch-section").hidden = true;
  document.querySelector("#comment-count").textContent = "0";
  document.querySelector("#like-count").textContent = "0";
}

async function loadProfile(user) {
  const { data, error } = await supabaseClient
    .from("profiles")
    .select("user_id, display_name, bio")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw error;

  if (data) return data;

  const defaultName = user.user_metadata?.display_name
    || user.user_metadata?.full_name
    || user.user_metadata?.name
    || user.email?.split("@")[0]
    || "SHIMOMIYA user";
  const { data: createdProfile, error: createError } = await supabaseClient
    .from("profiles")
    .upsert({ user_id: user.id, display_name: defaultName, bio: "" }, { onConflict: "user_id" })
    .select("user_id, display_name, bio")
    .single();
  if (createError) throw createError;
  return createdProfile;
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
  document.querySelector("#chat-empty").hidden = true;
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
    const displayName = currentProfile?.display_name || currentUser.email?.split("@")[0] || "U";
    accountButton.textContent = displayName.slice(0, 1).toUpperCase();
    accountButton.setAttribute("aria-label", `プロフィールを編集: ${displayName}`);
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

function openProfileDialog() {
  if (!currentUser) {
    openAuthDialog();
    return;
  }
  document.querySelector("#profile-error").textContent = "";
  document.querySelector("#profile-email").textContent = currentUser.email || "";
  document.querySelector("#profile-display-name").value = currentProfile?.display_name || currentUser.email?.split("@")[0] || "";
  document.querySelector("#profile-bio").value = currentProfile?.bio || "";
  const googleLinked = currentUser.identities?.some((identity) => identity.provider === "google");
  document.querySelector("#profile-google-status").textContent = googleLinked
    ? "Googleアカウントは連携済みです。"
    : "Googleアカウントを連携すると、次回からGoogleでもログインできます。";
  document.querySelector("#google-link").disabled = Boolean(googleLinked);
  document.querySelector("#google-link").textContent = googleLinked ? "Google連携済み" : "Googleアカウントを連携";
  document.querySelector("#profile-dialog").showModal();
}

async function startGoogleAuth(linkAccount = false) {
  const button = document.querySelector(linkAccount ? "#google-link" : "#google-login");
  const errorMessage = document.querySelector(linkAccount ? "#profile-error" : "#auth-error");
  errorMessage.textContent = "";
  button.disabled = true;
  try {
    if (!linkAccount && uploadAfterLogin) sessionStorage.setItem("shimomiya-upload-after-google", "true");
    const options = { redirectTo: window.location.href.split("#")[0] };
    const result = linkAccount
      ? await supabaseClient.auth.linkIdentity({ provider: "google", options })
      : await supabaseClient.auth.signInWithOAuth({ provider: "google", options });
    if (result.error) throw result.error;
  } catch (error) {
    if (!linkAccount) sessionStorage.removeItem("shimomiya-upload-after-google");
    errorMessage.textContent = `${linkAccount ? "Google連携" : "Googleログイン"}に失敗しました: ${error.message}`;
    button.disabled = false;
  }
}

async function saveProfile(event) {
  event.preventDefault();
  if (!currentUser) return;

  const displayName = document.querySelector("#profile-display-name").value.trim();
  const bio = document.querySelector("#profile-bio").value.trim();
  const errorMessage = document.querySelector("#profile-error");
  const submitButton = document.querySelector("#profile-submit");
  errorMessage.textContent = "";
  if (!displayName) {
    errorMessage.textContent = "表示名を入力してください。";
    return;
  }

  submitButton.disabled = true;
  try {
    const { data, error } = await supabaseClient
      .from("profiles")
      .upsert({
        user_id: currentUser.id,
        display_name: displayName,
        bio,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" })
      .select("user_id, display_name, bio")
      .single();
    if (error) throw error;

    currentProfile = data;
    updateAccountUI();
    await loadRemoteVideos();
    document.querySelector("#profile-dialog").close();
    showToast("プロフィールを更新しました");
  } catch (error) {
    errorMessage.textContent = `プロフィールを保存できませんでした: ${error.message}`;
  } finally {
    submitButton.disabled = false;
  }
}

async function syncSession(session) {
  currentUser = session?.user || null;
  const continueUploadAfterGoogle = Boolean(currentUser && sessionStorage.getItem("shimomiya-upload-after-google"));
  if (continueUploadAfterGoogle) sessionStorage.removeItem("shimomiya-upload-after-google");
  currentProfile = null;
  updateAccountUI();
  if (currentUser) {
    try {
      currentProfile = await loadProfile(currentUser);
      updateAccountUI();
      if (continueUploadAfterGoogle) document.querySelector("#upload-dialog").showModal();
    } catch (error) {
      document.querySelector("#connection-status").textContent = `プロフィールの読み込みに失敗: ${error.message}`;
    }
  } else {
    document.querySelector("#profile-dialog").close();
  }

  try {
    await loadRemoteVideos();
  } catch (error) {
    document.querySelector("#connection-status").textContent = `動画の読み込みに失敗: ${error.message}`;
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
  const thumbnailInput = document.querySelector("#upload-thumbnail");
  const thumbnail = thumbnailInput.files[0];
  const title = document.querySelector("#upload-title-input").value.trim();
  const errorMessage = document.querySelector("#upload-error");
  const submitButton = document.querySelector("#upload-submit");
  const allowedTypes = ["video/mp4", "video/webm", "video/quicktime"];
  const allowedThumbnailTypes = ["image/jpeg", "image/png", "image/webp"];
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
  if (thumbnail && !allowedThumbnailTypes.includes(thumbnail.type)) {
    errorMessage.textContent = "サムネイルはJPEG、PNG、WebP形式の画像を選択してください。";
    return;
  }
  if (thumbnail && thumbnail.size > 5 * 1024 * 1024) {
    errorMessage.textContent = "サムネイル画像は5MB以下にしてください。";
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = "アップロード中…";
  const uploadedPaths = [];
  try {
    const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100);
    const objectId = crypto.randomUUID();
    const path = `${currentUser.id}/${objectId}-${safeFileName}`;
    const { error: storageError } = await supabaseClient.storage
      .from("videos")
      .upload(path, file, { contentType: file.type, cacheControl: "3600", upsert: false });
    if (storageError) throw storageError;
    uploadedPaths.push(path);

    let thumbnailPath = null;
    if (thumbnail) {
      const safeThumbnailName = thumbnail.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100);
      thumbnailPath = `${currentUser.id}/${objectId}-thumbnail-${safeThumbnailName}`;
      const { error: thumbnailError } = await supabaseClient.storage
        .from("videos")
        .upload(thumbnailPath, thumbnail, { contentType: thumbnail.type, cacheControl: "3600", upsert: false });
      if (thumbnailError) throw thumbnailError;
      uploadedPaths.push(thumbnailPath);
    }

    const { error: metadataError } = await supabaseClient.from("videos").insert({
      owner_id: currentUser.id,
      title,
      description: document.querySelector("#upload-description-input").value.trim(),
      category: document.querySelector("#upload-category").value,
      video_path: path,
      thumbnail_path: thumbnailPath,
    });
    if (metadataError) throw metadataError;
    uploadedPaths.length = 0;

    await loadRemoteVideos();
    document.querySelector("#upload-dialog").close();
    document.querySelector("#upload-form").reset();
    resetThumbnailPreview();
    showToast("動画をSupabaseに保存して公開しました");
  } catch (error) {
    let message = error.message;
    if (uploadedPaths.length) {
      const { error: cleanupError } = await supabaseClient.storage.from("videos").remove(uploadedPaths);
      if (cleanupError) message += ` (アップロード済みファイルの削除にも失敗しました: ${cleanupError.message})`;
    }
    errorMessage.textContent = `アップロードに失敗しました: ${message}`;
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "アップロード";
  }
}

function selectCategory(category) {
  selectedCategory = category;
  document.querySelectorAll(".pill").forEach((pill) => pill.classList.toggle("active", pill.dataset.category === category));
  document.querySelectorAll(".category-link").forEach((link) => link.classList.toggle("active", link.dataset.category === category));
  document.querySelector("#feed-title").textContent = category === "すべて" ? "投稿動画" : `${category}の動画`;
  renderVideos();
}

document.querySelector("#comment-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const input = document.querySelector("#comment-input");
  const text = input.value.trim();
  if (!text) {
    input.focus();
    return;
  }
  launchComment(text, { color: "color-yellow", user: "me" });
  document.querySelector("#comment-count").textContent = (Number(document.querySelector("#comment-count").textContent.replaceAll(",", "")) + 1).toLocaleString("ja-JP");
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

const mainVideo = document.querySelector("#main-video");
mainVideo.addEventListener("loadedmetadata", () => {
  updateVideoDimensions();
  updatePlayerProgress();
});
mainVideo.addEventListener("durationchange", updatePlayerProgress);
mainVideo.addEventListener("timeupdate", updatePlayerProgress);
mainVideo.addEventListener("play", updatePlayerState);
mainVideo.addEventListener("pause", updatePlayerState);
mainVideo.addEventListener("ended", updatePlayerState);
mainVideo.addEventListener("error", () => showToast("動画を読み込めませんでした"));
document.querySelector("#player-play").addEventListener("click", togglePlayback);
document.querySelector("#player-center-play").addEventListener("click", togglePlayback);
document.querySelector("#video-frame").addEventListener("click", (event) => {
  if (event.target === mainVideo) togglePlayback();
});
document.querySelector("#player-seek").addEventListener("input", (event) => {
  if (mainVideo.duration) mainVideo.currentTime = (Number(event.currentTarget.value) / 1000) * mainVideo.duration;
});
document.querySelector("#player-mute").addEventListener("click", () => {
  mainVideo.muted = !mainVideo.muted;
  updatePlayerState();
});
document.querySelector("#player-volume").addEventListener("input", (event) => {
  mainVideo.volume = Number(event.currentTarget.value);
  mainVideo.muted = mainVideo.volume === 0;
  updatePlayerState();
});
document.querySelector("#player-fullscreen").addEventListener("click", async () => {
  const frame = document.querySelector("#video-frame");
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else if (frame.requestFullscreen) {
      await frame.requestFullscreen();
    } else if (mainVideo.webkitEnterFullscreen) {
      mainVideo.webkitEnterFullscreen();
    } else {
      showToast("このブラウザーでは全画面表示を利用できません");
    }
  } catch {
    showToast("全画面表示に切り替えできませんでした");
  }
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
  document.querySelector("#feed-title").textContent = link.dataset.view === "おすすめ" ? "投稿動画" : link.dataset.view;
  document.querySelector("#sort-button").innerHTML = sortOrder === "popular" ? '人気順 <span aria-hidden="true">⌄</span>' : '新着順 <span aria-hidden="true">⌄</span>';
  renderVideos();
  if (link.dataset.view === "新着動画") showToast("新着動画を表示しています");
  if (link.dataset.view === "ランキング") showToast("今週のランキングを表示しています");
  document.querySelector("#feed-section").scrollIntoView({ behavior: reducedMotion.matches ? "auto" : "smooth" });
}));

document.querySelector("#hero-play").addEventListener("click", () => {
  const latestVideo = [...remoteVideos].sort((first, second) => new Date(second.created_at) - new Date(first.created_at))[0];
  if (latestVideo) {
    playVideo(latestVideo);
  } else {
    showToast("まずは投稿動画を選ぶか、ログインして動画を投稿してください");
    document.querySelector("#feed-section").scrollIntoView({ behavior: reducedMotion.matches ? "auto" : "smooth" });
  }
});

document.querySelector("#close-player").addEventListener("click", () => {
  document.querySelector("#main-video").pause();
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
document.querySelector("#account-button").addEventListener("click", openProfileDialog);
async function signOut() {
  if (!currentUser) return;
  supabaseClient.auth.signOut().then(({ error }) => {
    if (error) showToast(`ログアウトに失敗しました: ${error.message}`);
    else showToast("ログアウトしました");
  });
}
document.querySelector("#profile-logout").addEventListener("click", signOut);
document.querySelector("#profile-form").addEventListener("submit", saveProfile);
document.querySelector("#google-login").addEventListener("click", () => startGoogleAuth());
document.querySelector("#google-link").addEventListener("click", () => startGoogleAuth(true));
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
let thumbnailPreviewUrl = null;
function resetThumbnailPreview() {
  if (thumbnailPreviewUrl) URL.revokeObjectURL(thumbnailPreviewUrl);
  thumbnailPreviewUrl = null;
  document.querySelector("#thumbnail-preview").hidden = true;
  document.querySelector("#thumbnail-preview-image").removeAttribute("src");
}
document.querySelector("#upload-thumbnail").addEventListener("change", (event) => {
  resetThumbnailPreview();
  const thumbnail = event.currentTarget.files[0];
  if (!thumbnail) return;
  const preview = document.querySelector("#thumbnail-preview");
  const image = document.querySelector("#thumbnail-preview-image");
  thumbnailPreviewUrl = URL.createObjectURL(thumbnail);
  image.src = thumbnailPreviewUrl;
  preview.hidden = false;
});
document.querySelector("#upload-dialog").addEventListener("close", () => {
  resetThumbnailPreview();
  document.querySelector("#upload-thumbnail").value = "";
});
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
    window.setTimeout(() => syncSession(session), 0);
  });
  supabaseClient.auth.getSession().then(({ data, error }) => {
    if (error) {
      document.querySelector("#connection-status").textContent = `Supabase認証エラー: ${error.message}`;
      return;
    }
    syncSession(data.session);
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
