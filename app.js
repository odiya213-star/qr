// QR Code Generator Application Logic

document.addEventListener('DOMContentLoaded', () => {
  // Tabs
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');
  let currentTab = 'url'; // 'url' | 'wifi' | 'vcard'

  // URL Tab DOM Elements
  const urlInput = document.getElementById('url-input');
  const clearBtn = document.getElementById('clear-btn');
  const pillBtns = document.querySelectorAll('.pill');

  // Wi-Fi Tab DOM Elements
  const wifiSsid = document.getElementById('wifi-ssid');
  const wifiPassword = document.getElementById('wifi-password');
  const wifiEncryption = document.getElementById('wifi-encryption');
  const wifiHidden = document.getElementById('wifi-hidden');

  // vCard Tab DOM Elements
  const vcardName = document.getElementById('vcard-name');
  const vcardOrg = document.getElementById('vcard-org');
  const vcardPhone = document.getElementById('vcard-phone');
  const vcardEmail = document.getElementById('vcard-email');
  const vcardUrl = document.getElementById('vcard-url');

  // Common Controls
  const sizeSelect = document.getElementById('size-select');
  const errorCorrectionSelect = document.getElementById('error-correction');
  const colorDarkInput = document.getElementById('color-dark');
  const colorLightInput = document.getElementById('color-light');
  const colorDarkVal = document.getElementById('color-dark-val');
  const colorLightVal = document.getElementById('color-light-val');
  const generateBtn = document.getElementById('generate-btn');
  const qrcodeContainer = document.getElementById('qrcode');
  const targetUrlDisplay = document.getElementById('target-url-display');
  const downloadBtn = document.getElementById('download-btn');
  const copyBtn = document.getElementById('copy-btn');
  const toast = document.getElementById('toast');
  const toastMsg = document.getElementById('toast-msg');

  let qrCodeInstance = null;
  let toastTimer = null;
  let debounceTimeout = null;

  // Error correction mapping for qrcodejs
  const correctLevels = {
    L: QRCode.CorrectLevel.L,
    M: QRCode.CorrectLevel.M,
    Q: QRCode.CorrectLevel.Q,
    H: QRCode.CorrectLevel.H
  };

  // Toast Helper
  function showToast(message, isError = false) {
    if (toastTimer) clearTimeout(toastTimer);
    toastMsg.textContent = message;
    if (isError) {
      toast.classList.add('error');
    } else {
      toast.classList.remove('error');
    }
    toast.classList.add('show');
    toastTimer = setTimeout(() => {
      toast.classList.remove('show');
    }, 2800);
  }

  // Escape special chars for Wi-Fi string
  function escapeWifi(str) {
    return str.replace(/([\\;,:"])/g, '\\$1');
  }

  // Escape special chars for vCard
  function escapeVCard(str) {
    return str.replace(/([\\,;])/g, '\\$1').replace(/\n/g, '\\n');
  }

  // Build Payload based on active tab
  function buildPayload() {
    if (currentTab === 'wifi') {
      const ssid = wifiSsid.value.trim();
      const pwd = wifiPassword.value;
      const type = wifiEncryption.value;
      const hidden = wifiHidden.checked ? 'true' : 'false';

      if (!ssid) {
        return {
          payload: 'WIFI:S:MyHome;T:WPA;P:;;',
          displayText: '와이파이: (SSID를 입력해주세요)'
        };
      }

      // WIFI:S:<SSID>;T:<WPA|WEP|nopass>;P:<PASSWORD>;H:<true|false>;;
      const payload = `WIFI:S:${escapeWifi(ssid)};T:${type};P:${type === 'nopass' ? '' : escapeWifi(pwd)};H:${hidden};;`;
      return {
        payload: payload,
        displayText: `와이파이: ${ssid} (${type === 'nopass' ? '암호없음' : '보안연결'})`
      };
    }

    if (currentTab === 'vcard') {
      const name = vcardName.value.trim();
      const org = vcardOrg.value.trim();
      const phone = vcardPhone.value.trim();
      const email = vcardEmail.value.trim();
      const url = vcardUrl.value.trim();

      if (!name && !phone) {
        return {
          payload: 'BEGIN:VCARD\r\nVERSION:3.0\r\nFN:이름\r\nEND:VCARD',
          displayText: '연락처: (이름 또는 번호를 입력해주세요)'
        };
      }

      let vcard = 'BEGIN:VCARD\r\nVERSION:3.0\r\n';
      if (name) vcard += `FN:${escapeVCard(name)}\r\nN:${escapeVCard(name)};;;;\r\n`;
      if (org) vcard += `ORG:${escapeVCard(org)}\r\n`;
      if (phone) vcard += `TEL;TYPE=CELL:${escapeVCard(phone)}\r\n`;
      if (email) vcard += `EMAIL:${escapeVCard(email)}\r\n`;
      if (url) vcard += `URL:${escapeVCard(url)}\r\n`;
      vcard += 'END:VCARD';

      return {
        payload: vcard,
        displayText: `연락처: ${name || '이름 없음'} ${phone ? '(' + phone + ')' : ''}`
      };
    }

    // Default: 'url'
    const rawValue = urlInput.value.trim();
    return {
      payload: rawValue || 'https://www.google.com',
      displayText: rawValue ? rawValue : '(내용 없음)'
    };
  }

  // Update clear button visibility
  function updateClearBtn() {
    if (urlInput.value.trim().length > 0) {
      clearBtn.style.display = 'flex';
    } else {
      clearBtn.style.display = 'none';
    }
  }

  // Generate or Update QR Code
  function renderQRCode() {
    const { payload, displayText } = buildPayload();
    const size = parseInt(sizeSelect.value, 10) || 256;
    const errorLevel = correctLevels[errorCorrectionSelect.value] || QRCode.CorrectLevel.M;
    const colorDark = colorDarkInput.value;
    const colorLight = colorLightInput.value;

    targetUrlDisplay.textContent = displayText;
    targetUrlDisplay.title = payload;

    // Clear previous QR code DOM
    qrcodeContainer.innerHTML = '';

    try {
      qrCodeInstance = new QRCode(qrcodeContainer, {
        text: payload,
        width: size,
        height: size,
        colorDark: colorDark,
        colorLight: colorLight,
        correctLevel: errorLevel
      });

      downloadBtn.disabled = false;
      copyBtn.disabled = false;
    } catch (err) {
      console.error('QR Code Generation Error:', err);
      showToast('QR 코드 생성 중 오류가 발생했습니다.', true);
      downloadBtn.disabled = true;
      copyBtn.disabled = true;
    }
  }

  // Debounced Render
  function triggerAutoRender() {
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => {
      renderQRCode();
    }, 180);
  }

  // Tab switching
  tabBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const tabTarget = btn.getAttribute('data-tab');
      if (tabTarget === currentTab) return;

      currentTab = tabTarget;
      tabBtns.forEach((b) => b.classList.remove('active'));
      tabPanes.forEach((p) => p.classList.remove('active'));

      btn.classList.add('active');
      const activePane = document.getElementById(`tab-content-${tabTarget}`);
      if (activePane) activePane.classList.add('active');

      renderQRCode();
    });
  });

  // Get current Canvas / Image Data
  function getQRCanvas(callback) {
    const canvas = qrcodeContainer.querySelector('canvas');
    if (canvas) {
      callback(canvas);
      return;
    }
    const img = qrcodeContainer.querySelector('img');
    if (img) {
      if (img.complete && img.naturalWidth > 0) {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = img.naturalWidth;
        tempCanvas.height = img.naturalHeight;
        const ctx = tempCanvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        callback(tempCanvas);
      } else {
        img.onload = () => {
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = img.naturalWidth;
          tempCanvas.height = img.naturalHeight;
          const ctx = tempCanvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          callback(tempCanvas);
        };
      }
    }
  }

  // Event Listeners - URL tab
  urlInput.addEventListener('input', () => {
    updateClearBtn();
    triggerAutoRender();
  });

  clearBtn.addEventListener('click', () => {
    urlInput.value = '';
    updateClearBtn();
    urlInput.focus();
    renderQRCode();
  });

  pillBtns.forEach((pill) => {
    pill.addEventListener('click', () => {
      const url = pill.getAttribute('data-url');
      if (url) {
        urlInput.value = url;
        updateClearBtn();
        renderQRCode();
        showToast(`'${pill.textContent}' 링크를 적용했습니다.`);
      }
    });
  });

  // Event Listeners - Wi-Fi tab inputs
  [wifiSsid, wifiPassword].forEach((input) => {
    input.addEventListener('input', triggerAutoRender);
  });
  wifiEncryption.addEventListener('change', triggerAutoRender);
  wifiHidden.addEventListener('change', triggerAutoRender);

  // Event Listeners - vCard tab inputs
  [vcardName, vcardOrg, vcardPhone, vcardEmail, vcardUrl].forEach((input) => {
    input.addEventListener('input', triggerAutoRender);
  });

  // Settings change listeners
  sizeSelect.addEventListener('change', renderQRCode);
  errorCorrectionSelect.addEventListener('change', renderQRCode);

  colorDarkInput.addEventListener('input', (e) => {
    colorDarkVal.textContent = e.target.value.toUpperCase();
    renderQRCode();
  });

  colorLightInput.addEventListener('input', (e) => {
    colorLightVal.textContent = e.target.value.toUpperCase();
    renderQRCode();
  });

  generateBtn.addEventListener('click', () => {
    renderQRCode();
    showToast('QR 코드를 새로고침했습니다!');
  });

  // Download as PNG
  downloadBtn.addEventListener('click', () => {
    getQRCanvas((canvas) => {
      try {
        const link = document.createElement('a');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        link.download = `qrcode_${currentTab}_${timestamp}.png`;
        link.href = canvas.toDataURL('image/png');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast('PNG 파일이 다운로드되었습니다!');
      } catch (err) {
        console.error('Download failed:', err);
        showToast('다운로드에 실패했습니다.', true);
      }
    });
  });

  // Copy Image to Clipboard
  copyBtn.addEventListener('click', async () => {
    getQRCanvas(async (canvas) => {
      try {
        if (!navigator.clipboard || !window.ClipboardItem) {
          showToast('이 브라우저는 이미지 복사를 지원하지 않습니다.', true);
          return;
        }

        canvas.toBlob(async (blob) => {
          if (!blob) {
            showToast('이미지 변환에 실패했습니다.', true);
            return;
          }
          try {
            const data = [new ClipboardItem({ 'image/png': blob })];
            await navigator.clipboard.write(data);
            showToast('QR 코드가 클립보드에 복사되었습니다! (Ctrl+V 로 붙여넣기 가능)');
          } catch (err) {
            console.error('Clipboard copy error:', err);
            showToast('로컬 보안 정책으로 복사 불가시 "PNG 다운로드"를 이용해주세요.', true);
          }
        }, 'image/png');
      } catch (err) {
        console.error(err);
        showToast('복사에 실패했습니다.', true);
      }
    });
  });

  // Initialize
  updateClearBtn();
  renderQRCode();
});
