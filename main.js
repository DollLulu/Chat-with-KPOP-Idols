document.addEventListener('DOMContentLoaded', () => {

  // --- Globals moved to the top to prevent TDZ (Temporal Dead Zone) crashes on load ---
  let AVATAR = 'Pic.jpg';
  let currentArtistKey = 'katseye';
  let isPlaying = false;
  let customArtistCount = 0;
  let lastTimestampShown = false;
  let lastReceivedAvatarEl = null;
  
  // A token we check so we can immediately kill playback if the trash is clicked
  let playbackToken = 0; 

  // --- Elements ---
  const messagesEl = document.getElementById('messages');
  const chatBody = document.getElementById('chatBody');
  const typingIndicator = document.getElementById('typingIndicator');
  const input = document.getElementById('messageInput');
  const sendBtn = document.getElementById('sendBtn');
  const statusTime = document.getElementById('statusTime');
  const phone = document.querySelector('.phone');

  const headerNameText = document.getElementById('headerNameText');
  const headerUsernameText = document.getElementById('headerUsernameText');
  const introNameText = document.getElementById('introNameText');
  const introUsernameText = document.getElementById('introUsernameText');
  const introMetaText = document.getElementById('introMetaText');
  const introFollowText = document.getElementById('introFollowText');

  const nameInput = document.getElementById('nameInput');
  const usernameInput = document.getElementById('usernameInput');
  const accountToggleBtn = document.getElementById('accountToggleBtn');
  const authContainer = document.getElementById('auth-container');
  const themeButtons = document.querySelectorAll('.theme-btn');
  const messageBoxesEl = document.getElementById('messageBoxes');
  const addMessageBtn = document.getElementById('addMessageBtn');
  const playBtn = document.getElementById('playBtn');
  const headerAvatarImg = document.getElementById('headerAvatarImg');
  const introAvatarImg = document.getElementById('introAvatarImg');
  const typingAvatarImg = document.getElementById('typingAvatarImg');
  const deleteChatBtn = document.getElementById('deleteChatBtn');
  const artistRail = document.getElementById('artistRail');
  const addArtistBtn = document.getElementById('addArtistBtn');
  const addArtistFreeBtn = document.getElementById('addArtistFreeBtn');
  const imageInput = document.getElementById('imageInput');

  // --- Configuration ---
  const FOLLOWUP_TEXT = "Write our dream cvs in the 'Chat Designer' and hit {icon}";
  const FOLLOWUP_ICON = 'Cat.png';

  // Artists that already delivered their one-time followup message won't auto-reply again
  const followupSentFor = new Set();

  const ARTISTS = {
    katseye: { name: 'KATSEYE', username: 'katseyeworld', headerAvatar: 'Pic.jpg', avatar: 'Pic.jpg', meta: '9.4M followers · 1.1K posts', follow: "You've followed this Instagram account since 2026", greeting: 'Hey cutie cutie', greetingIcon: 'Strawberry.png' },
    illit: { name: 'ILLIT 아일릿', username: 'illit_official', headerAvatar: 'illit.png', avatar: 'illit.png', meta: '7.8M followers · 767 posts', follow: "You've followed this Instagram account since 2026", greeting: 'Hi Pretty', greetingIcon: 'MyMelody.png' },
    cortis: { name: 'CORTIS', username: 'cortis', headerAvatar: 'cortis.jpg', avatar: 'cortis.jpg', meta: '15M followers · 1.6K posts', follow: "You've followed this Instagram account since 2026", greeting: 'Hey wassup', greetingIcon: null },
    h2h: { name: 'Hearts2Hearts H2H', username: 'hearts2hearts', headerAvatar: 'h2h.jpg', avatar: 'h2h.jpg', meta: '5.5M followers · 1.8K posts', follow: "You've followed this Instagram account since 2026", greeting: 'Hey Sweetie 💗', greetingIcon: null },
  };

  const chatThreads = {};

  function saveCurrentThread() {
    chatThreads[currentArtistKey] = {
      html: messagesEl.innerHTML,
      lastTimestampShown,
    };
  }

  function restoreThread(key) {
    const saved = chatThreads[key];
    hideTyping();
    if (saved) {
      messagesEl.innerHTML = saved.html;
      lastTimestampShown = saved.lastTimestampShown;
    } else {
      messagesEl.innerHTML = '';
      lastTimestampShown = false;
    }
    const receivedAvatars = messagesEl.querySelectorAll('.msg-row.received .msg-avatar');
    lastReceivedAvatarEl = receivedAvatars.length ? receivedAvatars[receivedAvatars.length - 1] : null;
    input.value = '';
    sendBtn.hidden = true;
    scrollToBottom();
  }

  function selectArtist(key) {
    const artist = ARTISTS[key];
    if (!artist || key === currentArtistKey) return;

    saveCurrentThread();

    currentArtistKey = key;
    artistButtons().forEach((btn) => btn.classList.toggle('active', btn.dataset.artist === key));

    AVATAR = artist.avatar;
    headerAvatarImg.src = artist.headerAvatar;
    introAvatarImg.src = artist.avatar;
    typingAvatarImg.src = artist.avatar;

    nameInput.value = artist.name;
    usernameInput.value = artist.username;
    headerNameText.textContent = artist.name;
    introNameText.textContent = artist.name;
    headerUsernameText.textContent = artist.username;
    introUsernameText.textContent = artist.username;
    introMetaText.textContent = artist.meta;
    introFollowText.textContent = artist.follow;
    refreshThemLabels();

    restoreThread(key);
  }

  function artistButtons() {
    return document.querySelectorAll('.artist-btn[data-artist]');
  }

  artistRail.addEventListener('click', (e) => {
    const btn = e.target.closest('.artist-btn[data-artist]');
    if (btn) selectArtist(btn.dataset.artist);
  });

  /* ---------- Upload a custom chat via Supabase Storage ---------- */
  const supabaseUrl = 'https://ikmupnnfnghzevdwejrh.supabase.co';
  const supabaseKey = 'sb_publishable_r3q8EF-m6MmAonVookxZeg_0j0SQMhT';
  const supabaseClient = window.supabase && typeof window.supabase.createClient === 'function'
    ? window.supabase.createClient(supabaseUrl, supabaseKey)
    : null;

  /* ---------- Auth ---------- */
  const authEmailInput = document.getElementById('auth-email');
  const authPasswordInput = document.getElementById('auth-password');
  const btnSignUp = document.getElementById('btn-signup');
  const btnSignIn = document.getElementById('btn-signin');
  const btnSignOut = document.getElementById('btn-signout');
  const authUserInfo = document.getElementById('auth-user-info');

  function showImageNotice(imageSrc) {
    const existing = document.querySelector('.image-notice-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.className = 'image-notice-overlay';

    const image = document.createElement('img');
    image.src = imageSrc;
    image.alt = '';
    image.className = 'image-notice';
    image.addEventListener('click', () => overlay.remove());

    overlay.appendChild(image);
    document.body.appendChild(overlay);
  }

  accountToggleBtn.addEventListener('click', () => {
    authContainer.hidden = !authContainer.hidden;
  });

  document.addEventListener('click', (e) => {
    if (authContainer.hidden) return;
    const clickedInsidePopover = authContainer.contains(e.target);
    const clickedToggle = accountToggleBtn.contains(e.target);
    if (!clickedInsidePopover && !clickedToggle) {
      authContainer.hidden = true;
    }
  });

  btnSignUp.addEventListener('click', async () => {
    if (!supabaseClient) {
      showImageNotice('Invalid.png');
      return;
    }
    const email = authEmailInput.value.trim();
    const password = authPasswordInput.value;

    if (!email || !password) {
      showImageNotice('Invalid.png');
      return;
    }

    const { error } = await supabaseClient.auth.signUp({ email, password });

    if (error) {
      showImageNotice('Invalid.png');
    } else {
      showImageNotice('created.png');
    }
  });

  btnSignIn.addEventListener('click', async () => {
    if (!supabaseClient) {
      showImageNotice('Invalid.png');
      return;
    }
    const email = authEmailInput.value.trim();
    const password = authPasswordInput.value;

    if (!email || !password) {
      showImageNotice('Invalid.png');
      return;
    }

    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });

    if (error) {
      showImageNotice('Invalid.png');
    } else {
      console.log('Signed in successfully:', data.user);
    }
  });

  btnSignOut.addEventListener('click', async () => {
    if (!supabaseClient) return;
    await supabaseClient.auth.signOut();
  });

  if (supabaseClient) {
    supabaseClient.auth.onAuthStateChange((event, session) => {
      const user = session?.user;

      if (user) {
        authUserInfo.textContent = `Logged in as: ${user.email}`;
        authUserInfo.style.display = 'block';
        btnSignOut.style.display = 'inline-block';
      } else {
        authUserInfo.style.display = 'none';
        btnSignOut.style.display = 'none';
      }
    });
  } else {
    authUserInfo.style.display = 'none';
    btnSignOut.style.display = 'none';
  }

  async function uploadUserImage(file) {
    if (!supabaseClient) {
      showImageNotice('Invalid.png');
      return null;
    }
    const { data: { user } } = await supabaseClient.auth.getUser();

    if (!user) {
      showImageNotice('signedin.png');
      return null;
    }

    const filePath = `${user.id}/${Date.now()}_${file.name}`;
    const { error } = await supabaseClient.storage.from('user-uploads').upload(filePath, file);
    
    if (error) {
      console.error('Upload error:', error.message);
      showImageNotice('Invalid.png');
      return null;
    }

    const { data: publicUrlData } = supabaseClient.storage.from('user-uploads').getPublicUrl(filePath);
    return publicUrlData.publicUrl;
  }

  addArtistBtn.addEventListener('click', async () => {
    if (!supabaseClient) {
      showImageNotice('Invalid.png');
      return;
    }
    const { data: { user } } = await supabaseClient.auth.getUser();

    if (!user) {
      authContainer.hidden = false;
      return;
    }

    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('has_paid')
      .eq('id', user.id)
      .single();

    if (!profile || !profile.has_paid) {
      const paypalLink = 'https://www.paypal.com/ncp/payment/LZEGJHLT9GZML';
      window.location.href = paypalLink;
      return;
    }

    imageInput.click();
  });

  addArtistFreeBtn.addEventListener('click', async () => {
    if (!supabaseClient) {
      showImageNotice('Invalid.png');
      return;
    }
    const { data: { user } } = await supabaseClient.auth.getUser();

    if (!user) {
      authContainer.hidden = false;
      return;
    }

    imageInput.click();
  });

  imageInput.addEventListener('change', async () => {
    const file = imageInput.files[0];
    if (!file) return;

    addArtistBtn.disabled = true;
    addArtistFreeBtn.disabled = true;
    const url = await uploadUserImage(file);
    addArtistBtn.disabled = false;
    addArtistFreeBtn.disabled = false;
    imageInput.value = '';
    if (!url) return;

    customArtistCount += 1;
    const key = `custom_${Date.now()}_${customArtistCount}`;
    const name = `New Friend ${customArtistCount}`;
    const username = `newfriend${customArtistCount}`;

    ARTISTS[key] = {
      name,
      username,
      headerAvatar: url,
      avatar: url,
      meta: '0 followers · 0 posts',
      follow: "You've followed this Instagram account since 2026",
      greeting: 'Hey there! 👋',
      greetingIcon: null,
    };

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'artist-btn';
    btn.dataset.artist = key;
    btn.setAttribute('aria-label', name);
    const img = document.createElement('img');
    img.src = url;
    img.alt = name;
    btn.appendChild(img);
    artistRail.insertBefore(btn, addArtistBtn);

    selectArtist(key);
  });

  function updateStatusClock() {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    if(statusTime) statusTime.textContent = `${h}:${m}`;
  }
  updateStatusClock();
  setInterval(updateStatusClock, 1000);

  function scrollToBottom() {
    chatBody.scrollTop = chatBody.scrollHeight;
  }

  function formatTime() {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  }

  function addTimestamp() {
    if (lastTimestampShown) return;
    const div = document.createElement('div');
    div.className = 'msg-timestamp';
    div.textContent = formatTime();
    messagesEl.appendChild(div);
    lastTimestampShown = true;
  }

  function addMessage(text, sender, iconSrc) {
    const row = document.createElement('div');
    row.className = `msg-row ${sender}`;

    if (sender === 'received') {
      const avatar = document.createElement('img');
      avatar.src = AVATAR;
      avatar.alt = 'avatar';
      avatar.className = 'msg-avatar';
      row.appendChild(avatar);

      if (lastReceivedAvatarEl) lastReceivedAvatarEl.classList.add('spacer');
      lastReceivedAvatarEl = avatar;
    }

    const bubble = document.createElement('div');
    bubble.className = 'msg-bubble';
    if (iconSrc && text.includes('{icon}')) {
      const [before, after] = text.split('{icon}');
      if (before) bubble.appendChild(document.createTextNode(before));
      const icon = document.createElement('img');
      icon.src = iconSrc;
      icon.alt = '';
      icon.className = iconSrc === FOLLOWUP_ICON ? 'bubble-icon bubble-icon-lg' : 'bubble-icon';
      bubble.appendChild(icon);
      if (after) bubble.appendChild(document.createTextNode(after));
    } else {
      bubble.appendChild(document.createTextNode(text));
      if (iconSrc) {
        const icon = document.createElement('img');
        icon.src = iconSrc;
        icon.alt = '';
        icon.className = 'bubble-icon';
        bubble.appendChild(icon);
      }
    }
    row.appendChild(bubble);

    messagesEl.appendChild(row);
    scrollToBottom();
    return row;
  }

  function addSeenIndicator(afterRow) {
    const div = document.createElement('div');
    div.className = 'seen-indicator';
    div.textContent = 'Seen just now';
    afterRow.after(div);
    scrollToBottom();
  }

  function showTyping() {
    if (lastReceivedAvatarEl) lastReceivedAvatarEl.classList.add('spacer');
    typingIndicator.hidden = false;
    scrollToBottom();
  }

  function hideTyping() {
    typingIndicator.hidden = true;
  }

  function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /* ---------- Profile name/username/theme ---------- */
  function refreshThemLabels() {
    const name = nameInput.value.trim() || 'Them';
    document.querySelectorAll('.sender-select option[value="them"]').forEach((opt) => {
      opt.textContent = name;
    });
  }

  nameInput.addEventListener('input', () => {
    const name = nameInput.value.trim() || 'KATSEYE';
    headerNameText.textContent = name;
    introNameText.textContent = name;
    refreshThemLabels();
  });

  usernameInput.addEventListener('input', () => {
    const username = usernameInput.value.trim() || 'username';
    headerUsernameText.textContent = username;
    introUsernameText.textContent = username;
  });

  introMetaText.addEventListener('input', () => {
    ARTISTS[currentArtistKey].meta = introMetaText.textContent;
  });

  introFollowText.addEventListener('input', () => {
    ARTISTS[currentArtistKey].follow = introFollowText.textContent;
  });

  themeButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      themeButtons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      phone.classList.toggle('dark', btn.dataset.theme === 'dark');
    });
  });

  /* ---------- Message scenario boxes ---------- */
  function createMessageBox(data) {
    const box = document.createElement('div');
    box.className = 'message-box';

    const topRow = document.createElement('div');
    topRow.className = 'message-box-row';

    const select = document.createElement('select');
    select.className = 'sender-select';
    const meOpt = document.createElement('option');
    meOpt.value = 'me';
    meOpt.textContent = 'Me';
    const themOpt = document.createElement('option');
    themOpt.value = 'them';
    themOpt.textContent = nameInput.value.trim() || 'Them';
    select.appendChild(meOpt);
    select.appendChild(themOpt);
    select.value = data.sender;

    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-message-btn';
    removeBtn.type = 'button';
    removeBtn.textContent = '✕';
    removeBtn.addEventListener('click', () => box.remove());

    topRow.appendChild(select);
    topRow.appendChild(removeBtn);

    const textarea = document.createElement('textarea');
    textarea.className = 'message-text';
    textarea.placeholder = 'Type message...';
    textarea.value = data.text;

    const bottomRow = document.createElement('div');
    bottomRow.className = 'message-box-row';
    const secondsLabel = document.createElement('label');
    secondsLabel.textContent = 'Display for';
    const secondsInput = document.createElement('input');
    secondsInput.type = 'number';
    secondsInput.className = 'message-seconds';
    secondsInput.min = '0';
    secondsInput.step = '0.5';
    secondsInput.value = data.seconds;
    const unit = document.createElement('span');
    unit.className = 'unit';
    unit.textContent = 'sec';

    bottomRow.appendChild(secondsLabel);
    bottomRow.appendChild(secondsInput);
    bottomRow.appendChild(unit);

    box.appendChild(topRow);
    box.appendChild(textarea);
    box.appendChild(bottomRow);

    return box;
  }

  // Changed default seconds from 3 to 1
  function addMessageBox(data = { sender: 'me', text: '', seconds: 1 }) {
    const box = createMessageBox(data);
    messageBoxesEl.appendChild(box);
  }

  addMessageBtn.addEventListener('click', () => addMessageBox());

  /* ---------- Play scenario ---------- */
  function readScenario() {
    const boxes = messageBoxesEl.querySelectorAll('.message-box');
    const scenario = [];
    boxes.forEach((box) => {
      const sender = box.querySelector('.sender-select').value;
      const text = box.querySelector('.message-text').value.trim();
      const seconds = parseFloat(box.querySelector('.message-seconds').value) || 0;
      if (text) scenario.push({ sender, text, seconds });
    });
    return scenario;
  }

  function resetChat() {
    messagesEl.innerHTML = '';
    hideTyping();
    lastTimestampShown = false;
    lastReceivedAvatarEl = null;
    input.value = '';
    sendBtn.hidden = true;
  }

  async function typeIntoInputBar(text, token) {
    input.value = '';
    sendBtn.hidden = true;
    for (let i = 0; i < text.length; i++) {
      input.value += text[i];
      if (input.value.trim().length > 0) sendBtn.hidden = false;
      await wait(35 + Math.random() * 55);
      
      // If the token changed during this wait (meaning trash was clicked), cancel out
      if (token !== playbackToken) return;
    }
    await wait(350);
  }

  async function playScenario() {
    const scenario = readScenario();
    if (scenario.length === 0) return;

    // Create a unique token for this animation run
    playbackToken++;
    const currentToken = playbackToken;

    playBtn.disabled = true;
    input.disabled = true;
    isPlaying = true;
    resetChat();

    // The requested 1 second delay before playback actually starts
    await wait(1000);
    if (currentToken !== playbackToken) return; // Verify trash wasn't clicked while waiting

    let lastSentRow = null;

    for (let i = 0; i < scenario.length; i++) {
      const item = scenario[i];
      const prev = scenario[i - 1];

      if (item.sender === 'me') {
        await typeIntoInputBar(item.text, currentToken);
        if (currentToken !== playbackToken) return; 

        addTimestamp();
        lastSentRow = addMessage(item.text, 'sent');
        input.value = '';
        sendBtn.hidden = true;
      } else {
        if (prev && prev.sender === 'me' && lastSentRow) {
          addSeenIndicator(lastSentRow);
          await wait(2000);
          if (currentToken !== playbackToken) return; 
        }
        showTyping();
        await wait(2200 + Math.random() * 800);
        if (currentToken !== playbackToken) return; 
        
        hideTyping();
        addMessage(item.text, 'received');
      }

      await wait(item.seconds * 1000);
      if (currentToken !== playbackToken) return; 
    }

    playBtn.disabled = false;
    input.disabled = false;
    isPlaying = false;
  }

  playBtn.addEventListener('click', playScenario);

  /* ---------- Manual chat input ---------- */
  async function triggerManualReply(threadKey) {
    const artist = ARTISTS[threadKey] || ARTISTS.katseye;

    await wait(2000);
    if (currentArtistKey !== threadKey) return;
    showTyping();

    await wait(1200 + Math.random() * 800);
    if (currentArtistKey !== threadKey) return;
    hideTyping();
    addMessage(artist.greeting, 'received', artist.greetingIcon);

    await wait(2000);
    if (currentArtistKey !== threadKey) return;
    showTyping();

    await wait(1200 + Math.random() * 800);
    if (currentArtistKey !== threadKey) return;
    hideTyping();
    addMessage(FOLLOWUP_TEXT, 'received', FOLLOWUP_ICON);
    followupSentFor.add(threadKey);
  }

  function sendMessage() {
    if (isPlaying) return;
    const text = input.value.trim();
    if (!text) return;

    addTimestamp();
    addMessage(text, 'sent');
    input.value = '';
    sendBtn.hidden = true;

    if (!followupSentFor.has(currentArtistKey)) {
      triggerManualReply(currentArtistKey);
    }
  }

  input.addEventListener('input', () => {
    sendBtn.hidden = input.value.trim().length === 0;
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      sendMessage();
    }
  });

  sendBtn.addEventListener('click', sendMessage);

  /* ---------- Delete chat ---------- */
  deleteChatBtn.addEventListener('click', () => {
    // Increment the token so the async playScenario loop knows to abort
    playbackToken++; 
    isPlaying = false;
    playBtn.disabled = false;
    input.disabled = false;

    resetChat();
    delete chatThreads[currentArtistKey];
    followupSentFor.delete(currentArtistKey);
  });
});