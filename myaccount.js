// =====================
// SUPABASE CONFIGURATION
// =====================
const SUPABASE_URL = 'https://ahhsnujwllarmhwunvsv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFoaHNudWp3bGxhcm1od3VudnN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3OTA3OTIsImV4cCI6MjA3NzM2Njc5Mn0.KbTR4zYe2vn0i-DLbN1kK738gmXtk2qOBAzU0L9ndsk';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// =====================
// WAREHOUSE HELPER FUNCTIONS
// =====================
async function updateWarehouseTables() {
  const today = new Date();
  const dateKey = parseInt(today.toISOString().slice(0, 10).replace(/-/g, ''));
  const fullDate = today.toISOString().slice(0, 10);
  
  try {
    // 1. Ensure date exists in dim_date
    const { error: dateError } = await supabase
      .from('dim_date')
      .upsert({
        date_key: dateKey,
        full_date: fullDate,
        year: today.getFullYear(),
        month: today.getMonth() + 1,
        day_of_month: today.getDate(),
        day_name: today.toLocaleDateString('en-US', { weekday: 'long' }),
        is_weekend: today.getDay() === 0 || today.getDay() === 6
      }, { onConflict: 'date_key' });
    
    if (dateError) console.error("Date dimension error:", dateError);
    
  } catch (err) {
    console.error("Warehouse update error:", err);
  }
}

// =====================
// ELEMENT REFERENCES
// =====================
const editProfileBtn = document.getElementById("editProfileBtn");
const editProfileModal = document.getElementById("editProfileModal");
const cancelEdit = document.getElementById("cancelEdit");
const saveProfile = document.getElementById("saveProfile");

const username = document.getElementById("username");
const bio = document.getElementById("bio");

const editName = document.getElementById("editName");
const editAge = document.getElementById("editAge");
const editBio = document.getElementById("editBio");
const editBirthday = document.getElementById("editBirthday");
const editGraduatedCourse = document.getElementById("editGraduatedCourse");
const editGraduationYear = document.getElementById("editGraduationYear");
const editCurrentProfession = document.getElementById("editCurrentProfession");
const editGender = document.getElementById("editGender");
const editLocation = document.getElementById("editLocation");
const editHeight = document.getElementById("editHeight");
const editHobbies = document.getElementById("editHobbies");
const editLookingFor = document.getElementById("editLookingFor");

const uploadProfilePic = document.getElementById("uploadProfilePic");
const profilePic = document.getElementById("profilePic");

const homeBtn = document.getElementById("homeBtn");
const logoutBtn = document.getElementById("logoutBtn");

// =====================
// GET CURRENT USER
// =====================
const currentUserId = localStorage.getItem('currentUserId');
const currentUsername = localStorage.getItem('currentUsername');

if (!currentUserId) {
  alert("Please log in first!");
  window.location.href = "rizzalian.html";
}

// =====================
// LOAD USER PROFILE
// =====================
async function loadProfile() {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', currentUserId)
      .single();

    if (error) {
      console.error("Error loading profile:", error);
      return;
    }

    if (data) {
      // Display username
      username.textContent = data.name || currentUsername;
      bio.textContent = data.bio || "No bio yet";

      // Display profile picture
      if (data.profile_pic_url) {
        profilePic.src = data.profile_pic_url;
      }

      // Build the extra profile details
      const extra = `
        <strong>Age:</strong> ${data.age || "N/A"}<br>
        <strong>Birthday:</strong> ${data.birthday || "N/A"}<br>
        <strong>Graduated Course:</strong> ${data.graduated_course || "N/A"}<br>
        <strong>Graduation Year:</strong> ${data.graduation_year || "N/A"}<br>
        <strong>Current Profession:</strong> ${data.current_profession || "N/A"}<br>
        <strong>Gender:</strong> ${data.gender || "N/A"}<br>
        <strong>Location:</strong> ${data.location || "N/A"}<br>
        <strong>Height:</strong> ${data.height || "N/A"}<br>
        <strong>Hobbies:</strong> ${data.hobbies || "N/A"}<br>
        <strong>Looking for:</strong> ${data.looking_for || "N/A"}
      `;

      document.getElementById("extraDetails").innerHTML = extra;
    }
  } catch (err) {
    console.error("Load profile error:", err);
  }
}

// Load profile on page load
loadProfile();

// =====================
// EDIT PROFILE HANDLING
// =====================
if (editProfileBtn) {
  editProfileBtn.addEventListener("click", async () => {
    editProfileModal.classList.add("active");

    // Load current profile data into form
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', currentUserId)
        .single();

      if (data) {
        editName.value = data.name || "";
        editAge.value = data.age || "";
        editBio.value = data.bio || "";
        editBirthday.value = data.birthday || "";
        editGraduatedCourse.value = data.graduated_course || "";
        editGraduationYear.value = data.graduation_year || "";
        editCurrentProfession.value = data.current_profession || "";
        editGender.value = data.gender || "";
        editLocation.value = data.location || "";
        editHeight.value = data.height || "";
        editHobbies.value = data.hobbies || "";
        editLookingFor.value = data.looking_for || "";
      }
    } catch (err) {
      console.error("Error loading edit form:", err);
    }
  });
}

if (cancelEdit) {
  cancelEdit.addEventListener("click", () => {
    editProfileModal.classList.remove("active");
  });
}

if (saveProfile) {
  saveProfile.addEventListener("click", async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          name: editName.value,
          age: parseInt(editAge.value) || null,
          bio: editBio.value,
          birthday: editBirthday.value || null,
          graduated_course: editGraduatedCourse.value,
          graduation_year: parseInt(editGraduationYear.value) || null,
          current_profession: editCurrentProfession.value,
          gender: editGender.value,
          location: editLocation.value,
          height: parseFloat(editHeight.value) || null,
          hobbies: editHobbies.value,
          looking_for: editLookingFor.value,
        })
        .eq('user_id', currentUserId);

      if (error) {
        alert("Error updating profile: " + error.message);
        console.error("Update error:", error);
        return;
      }

      // Update warehouse tables
      await updateWarehouseTables();

      editProfileModal.classList.remove("active");
      alert("✅ Profile updated successfully!");

      // Reload profile to show updated data
      loadProfile();

    } catch (err) {
      console.error("Save profile error:", err);
      alert("An unexpected error occurred.");
    }
  });
}

// =====================
// PROFILE PIC UPLOAD
// =====================
if (uploadProfilePic) {
  uploadProfilePic.addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${currentUserId}-${Date.now()}.${fileExt}`;
      const filePath = `${currentUserId}/${fileName}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('profile-pics')
        .upload(filePath, file, {
          upsert: true
        });

      if (uploadError) {
        alert("Error uploading image: " + uploadError.message);
        console.error("Upload error:", uploadError);
        return;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('profile-pics')
        .getPublicUrl(filePath);

      const publicURL = urlData.publicUrl;

      // Update profile with new image URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ profile_pic_url: publicURL })
        .eq('user_id', currentUserId);

      if (updateError) {
        alert("Error updating profile picture: " + updateError.message);
        console.error("Update error:", updateError);
        return;
      }

      // Display new image immediately
      profilePic.src = publicURL;

      // Update warehouse tables
      await updateWarehouseTables();

      alert("✅ Profile picture updated!");

    } catch (err) {
      console.error("Profile pic upload error:", err);
      alert("An unexpected error occurred.");
    }
  });
}

// =====================
// NAVIGATION BUTTONS
// =====================
// 🏠 HOME BUTTON
if (homeBtn) {
  homeBtn.addEventListener("click", () => {
    window.location.href = "home.html";
  });
}

// 🚪 LOGOUT BUTTON
if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    if (confirm("Are you sure you want to log out?")) {
      localStorage.removeItem('currentUserId');
      localStorage.removeItem('currentUsername');
      window.location.href = "rizzalian.html";
    }
  });
}


// not sureeee

// ...existing code...

/* Populate #userId and profileCard data-id from Supabase auth or from a global if available.
   This makes the delete handler able to find the id synchronously. */
(function populateUserIdField(){
  async function getSupabaseUserId(supabase) {
    if (!supabase) return null;
    try {
      if (typeof supabase.auth?.getUser === 'function') {
        const { data, error } = await supabase.auth.getUser();
        if (!error && data?.user?.id) return data.user.id;
      }
      if (typeof supabase.auth?.getSession === 'function') {
        const { data, error } = await supabase.auth.getSession();
        if (!error && data?.session?.user?.id) return data.session.user.id;
      }
    } catch (e) {
      console.warn('getSupabaseUserId error', e);
    }
    return null;
  }

  async function init() {
    const input = document.getElementById('userId');
    const card = document.getElementById('profileCard');
    const existing = input?.value || card?.getAttribute('data-id') || window.currentUserId || window.userId || null;
    if (existing) {
      if (input) input.value = existing;
      if (card) card.setAttribute('data-id', existing);
      console.log('[init] userId set from existing value:', existing);
      return;
    }

    const supabase = window.supabase || window.supabaseClient || null;
    if (!supabase) {
      console.log('[init] no supabase client found to resolve user id');
      return;
    }

    const uid = await getSupabaseUserId(supabase);
    if (uid) {
      if (input) input.value = uid;
      if (card) card.setAttribute('data-id', uid);
      console.log('[init] userId populated from supabase:', uid);
    } else {
      console.log('[init] supabase client present but no auth user found');
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();

/* Improved delete-profile handler with robust Supabase auth checks */
(function(){
  function findUserId() {
    const card = document.getElementById('profileCard') || document.querySelector('.profile-card');
    if (card && card.dataset && card.dataset.id) {
      console.log('[delete] userId from data-id:', card.dataset.id);
      return card.dataset.id;
    }
    const hidden = document.getElementById('userId') || document.querySelector('input[name="userId"]') || document.querySelector('[data-user-id]');
    if (hidden) {
      const v = hidden.value || hidden.getAttribute('value') || hidden.getAttribute('data-user-id');
      if (v) { console.log('[delete] userId from hidden field:', v); return v; }
    }
    if (window.currentUserId) { console.log('[delete] userId from window.currentUserId:', window.currentUserId); return window.currentUserId; }
    if (window.userId) { console.log('[delete] userId from window.userId:', window.userId); return window.userId; }
    if (window.CURRENT_USER && window.CURRENT_USER.id) { console.log('[delete] userId from window.CURRENT_USER.id:', window.CURRENT_USER.id); return window.CURRENT_USER.id; }
    console.log('[delete] no DOM user id found; will attempt supabase auth if available');
    return null;
  }

  async function getAuthUserId(supabase) {
    if (!supabase || !supabase.auth) return null;
    try {
      if (typeof supabase.auth.getUser === 'function') {
        const { data, error } = await supabase.auth.getUser();
        if (!error && data?.user?.id) { console.log('[delete] supabase.auth.getUser ->', data.user.id); return data.user.id; }
      }
      if (typeof supabase.auth.getSession === 'function') {
        const { data, error } = await supabase.auth.getSession();
        if (!error && data?.session?.user?.id) { console.log('[delete] supabase.auth.getSession ->', data.session.user.id); return data.session.user.id; }
      }
      if (typeof supabase.auth.session === 'function') {
        const s = supabase.auth.session();
        if (s?.user?.id) { console.log('[delete] supabase.auth.session ->', s.user.id); return s.user.id; }
      }
    } catch (err) {
      console.error('[delete] getAuthUserId error', err);
    }
    return null;
  }

  async function tryDeleteOnTable(supabase, table, userId) {
    try {
      let { data, error } = await supabase.from(table).delete().eq('id', userId);
      if (!error) return { ok: true, table, method: 'id', data };
      ({ data, error } = await supabase.from(table).delete().eq('user_id', userId));
      if (!error) return { ok: true, table, method: 'user_id', data };
      return { ok: false, table, error };
    } catch (err) {
      return { ok: false, table, error: err };
    }
  }

  async function deleteProfileFromDb(supabase, userId) {
    if (!supabase) return { ok: false, reason: 'no-supabase-client' };
    const tables = ['profiles','profile','users','user_profiles']; // adjust to your schema
    for (const t of tables) {
      const res = await tryDeleteOnTable(supabase, t, userId);
      console.log('[delete] attempt', t, res);
      if (res.ok) return { ok: true, table: t, method: res.method };
    }
    return { ok: false, reason: 'no-table-matched' };
  }

  async function onDeleteClick(e) {
    e.preventDefault();
    const name = document.getElementById('username')?.textContent || 'this profile';
    if (!confirm(`Are you sure you want to permanently delete ${name}? This action cannot be undone.`)) return;

    const domId = findUserId();
    const supabase = window.supabase || window.supabaseClient || null;
    let userId = domId || null;

    if (supabase && !userId) {
      userId = await getAuthUserId(supabase);
    }

    if (!supabase) {
      console.warn('[delete] Supabase client not found on window (window.supabase). Falling back to UI-only removal.');
      document.querySelector('.profile-card')?.remove();
      alert('Profile removed from UI (no DB deletion).');
      window.location.href = 'rizzalian.html';
      return;
    }

    if (!userId) {
      console.error('[delete] User id not found to delete. Add data-id to the profile card or ensure Supabase auth session exists.');
      alert('Could not determine user id to delete. Open console for details.');
      console.log('Add one of these to myaccount.html:');
      console.log('<section class="profile-card" id="profileCard" data-id="USER_ID_HERE">');
      console.log('<input type="hidden" id="userId" value="USER_ID_HERE">');
      return;
    }

    try {
      const result = await deleteProfileFromDb(supabase, userId);
      if (result.ok) {
        try { await supabase.auth.signOut(); } catch(_) {}
        alert('Profile deleted.');
        window.location.href = 'rizzalian.html';
        return;
      } else {
        console.warn('[delete] delete attempts failed:', result);
        alert('Delete failed. Check console for details.');
      }
    } catch (err) {
      console.error('[delete] Unhandled delete error', err);
      alert('An error occurred during deletion. See console.');
    }
  }

  function init(){
    const btn = document.getElementById('deleteProfileBtn');
    if (!btn) { console.warn('[delete] deleteProfileBtn not found'); return; }
    btn.removeEventListener('click', onDeleteClick);
    btn.addEventListener('click', onDeleteClick);
    console.log('[delete] deleteProfile handler attached');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();

/* Optional debug probe: logs and attempts to populate id from Supabase (helps diagnose failures) */
(function debugPopulateUserId(){
  async function probe() {
    console.log('[debug] window.supabase present?', !!(window.supabase || window.supabaseClient));
    console.log('[debug] #userId value:', document.getElementById('userId')?.value);
    console.log('[debug] profileCard dataset.id:', document.getElementById('profileCard')?.dataset.id);

    const supabase = window.supabase || window.supabaseClient || null;
    if (!supabase) {
      console.warn('[debug] supabase client not found on window. Ensure initialization script runs before myaccount.js.');
      return;
    }

    try {
      if (typeof supabase.auth?.getUser === 'function') {
        const { data, error } = await supabase.auth.getUser();
        console.log('[debug] supabase.auth.getUser ->', { data, error });
        if (data?.user?.id) {
          document.getElementById('userId').value = data.user.id;
          document.getElementById('profileCard')?.setAttribute('data-id', data.user.id);
          console.log('[debug] populated user id from supabase.auth.getUser:', data.user.id);
          return;
        }
      }
      if (typeof supabase.auth?.getSession === 'function') {
        const { data, error } = await supabase.auth.getSession();
        console.log('[debug] supabase.auth.getSession ->', { data, error });
        if (data?.session?.user?.id) {
          document.getElementById('userId').value = data.session.user.id;
          document.getElementById('profileCard')?.setAttribute('data-id', data.session.user.id);
          console.log('[debug] populated user id from supabase.auth.getSession:', data.session.user.id);
          return;
        }
      }
      console.warn('[debug] supabase present but no authenticated user found (session/user is null).');
    } catch (err) {
      console.error('[debug] error probing supabase auth', err);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', probe); else probe();
})();
