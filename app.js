// ==========================================
// KONFIGURASI OPENROUTER
// ==========================================

const OPENROUTER_URL = '/api/chat';

const MODELS = [
    'meta-llama/llama-3.2-3b-instruct:free',
    'google/gemma-2-9b-it:free',  
    'qwen/qwen-2.5-7b-instruct:free',
    'microsoft/phi-3-mini-128k-instruct:free',
    'liquid/lfm-40b:free'
];

let currentModelIndex = 0;

// ==========================================
// STATE MANAGEMENT
// ==========================================
let isGenerating = false;
let currentResep = [];

// ==========================================
// FUNGSI UTAMA: GENERATE RESEP
// ==========================================
async function generateResep() {
    if (isGenerating) return;

    const bahanInput = document.getElementById('bahan').value.trim();

    if (!bahanInput) {
        showError('Silakan masukkan bahan yang tersedia!');
        return;
    }

    setLoading(true);
    hideError();

    try {
        const prompt = buatPrompt(bahanInput);
        const responseText = await callOpenRouterAPI(prompt);
        const resepList = parseResep(responseText);

        displayResep(resepList, bahanInput);
        simpanHistory(bahanInput, resepList);

    } catch (error) {
        console.error('Error:', error);
        showError('Gagal generate resep: ' + error.message);
    } finally {
        setLoading(false);
    }
}

// ==========================================
// PROMPT ENGINEERING
// ==========================================
function buatPrompt(bahan) {
    return `Kamu adalah chef Indonesia yang ahli. Saya punya bahan: ${bahan}

Buatkan 3 resep masakan Indonesia yang bisa dibuat dengan bahan tersebut.

Format response HARUS JSON seperti ini:
{
  "resep": [
    {
      "nama": "Nama Masakan",
      "estimasi_waktu": "30 menit",
      "kesulitan": "Mudah/Sedang/Sulit",
      "porsi": "2 orang",
      "bahan_digunakan": ["bahan1", "bahan2"],
      "bahan_tambahan": ["bahan yang perlu dibeli"],
      "langkah": ["langkah 1", "langkah 2", "langkah 3"],
      "tips": "tips memasak"
    }
  ]
}

Pastikan:
1. Resep realistis dan bisa dimasak
2. Bahasa Indonesia yang natural
3. Jika bahan kurang, sebutkan bahan tambahan yang perlu dibeli
4. Estimasi waktu dan tingkat kesulitan realistis`;
}

// ==========================================
// API CALL KE OPENROUTER
// ==========================================
async function callOpenRouterAPI(prompt, retryCount = 0) {
    const currentModel = MODELS[currentModelIndex];
    console.log(`Mencoba model: ${currentModel} (retry: ${retryCount})`);

    const response = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: currentModel,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7,
            max_tokens: 2048
        })
    });

    // Handle 429 - Rate limit
    if (response.status === 429) {
        if (currentModelIndex < MODELS.length - 1) {
            currentModelIndex++;
            console.log(`Rate limit! Ganti ke model: ${MODELS[currentModelIndex]}`);
            showError(`⏳ Tunggu sebentar ya...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
            return callOpenRouterAPI(prompt, retryCount);
        }

        if (retryCount < 3) {
            currentModelIndex = 0;
            const waitTime = (retryCount + 1) * 10000;
            showError(`⏳ Semua model sibuk, mencoba lagi dalam ${waitTime / 1000} detik...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            return callOpenRouterAPI(prompt, retryCount + 1);
        }

        throw new Error('Server sedang sibuk, coba lagi beberapa menit lagi!');
    }

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `HTTP error! status: ${response.status}`);
    }

    currentModelIndex = 0;
    const data = await response.json();
    
    console.log('Full response data:', JSON.stringify(data));

    // ✅ Cek error dari OpenRouter
    if (data.error) {
        throw new Error(data.error.message || 'OpenRouter error');
    }

    // ✅ Cek choices ada
    if (!data.choices || data.choices.length === 0) {
        throw new Error('Tidak ada response: ' + JSON.stringify(data));
    }

    // ✅ Cek message content ada
    if (!data.choices[0].message || !data.choices[0].message.content) {
        throw new Error('Content kosong: ' + JSON.stringify(data.choices[0]));
    }

    return data.choices[0].message.content;

}

// ==========================================
// PARSE RESPONSE JSON
// ==========================================
function parseResep(textResponse) {
    try {
        let cleanText = textResponse
            .replace(/```json\n?/g, '')
            .replace(/```\n?/g, '')
            .trim();

        const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
        if (jsonMatch) cleanText = jsonMatch[0];

        const parsed = JSON.parse(cleanText);
        return parsed.resep || [];
    } catch (e) {
        console.warn('JSON parse failed, using fallback:', e);
        return parseFallback(textResponse);
    }
}

function parseFallback(text) {
    return [{
        nama: "Resep dari AI",
        estimasi_waktu: "30 menit",
        kesulitan: "Sedang",
        porsi: "2 orang",
        bahan_digunakan: ["Lihat langkah memasak"],
        bahan_tambahan: ["Sesuai kebutuhan"],
        langkah: [text.substring(0, 1000)],
        tips: "Selamat mencoba!"
    }];
}

// ==========================================
// DISPLAY RESEP
// ==========================================
function displayResep(resepList, bahanInput) {
    const container = document.getElementById('resepContainer');
    const section = document.getElementById('hasilSection');
    const placeholder = document.getElementById('placeholderSection');

    container.innerHTML = '';
    currentResep = resepList;

    resepList.forEach((resep, index) => {
        const card = createResepCard(resep, index, bahanInput);
        container.appendChild(card);
    });

    section.classList.remove('hidden');
    if (placeholder) placeholder.classList.add('hidden');
    section.scrollIntoView({ behavior: 'smooth' });
}

function createResepCard(resep, index, bahanInput) {
    const card = document.createElement('div');
    card.className = 'resep-card';

    const bahanList = resep.bahan_digunakan?.map(b => `<li>${b}</li>`).join('') || '<li>-</li>';
    const tambahanList = resep.bahan_tambahan?.map(b => `<li>${b}</li>`).join('') || '';
    const langkahList = resep.langkah?.map((l, i) => `<li>${l}</li>`).join('') || '<li>Lihat tips</li>';

    card.innerHTML = `
        <div class="resep-header">
            <h3 class="resep-title">${resep.nama || 'Resep Tanpa Nama'}</h3>
            <span class="resep-badge">${resep.estimasi_waktu || '30 menit'}</span>
        </div>

        <div style="margin-bottom: 15px;">
            <span style="background:#e3f2fd; padding:4px 10px; border-radius:15px; font-size:0.85rem; margin-right:8px;">
                🎯 ${resep.kesulitan || 'Sedang'}
            </span>
            <span style="background:#fff3e0; padding:4px 10px; border-radius:15px; font-size:0.85rem;">
                🍽️ ${resep.porsi || '2 orang'}
            </span>
        </div>

        <div class="resep-bahan">
            <h4>🥘 Bahan yang Digunakan:</h4>
            <ul>${bahanList}</ul>
        </div>

        ${tambahanList ? `
        <div class="resep-bahan" style="background:#fff3e0;">
            <h4>🛒 Bahan Tambahan:</h4>
            <ul>${tambahanList}</ul>
        </div>` : ''}

        <div class="resep-langkah">
            <h4>👨‍🍳 Cara Membuat:</h4>
            <ol>${langkahList}</ol>
        </div>

        ${resep.tips ? `
        <div class="resep-tips">
            <strong>💡 Tips:</strong> ${resep.tips}
        </div>` : ''}

        <div class="resep-actions">
            <button class="btn-simpan" onclick="simpanResep(${index})">
                💾 Simpan Resep
            </button>
            <button class="btn-share" onclick="shareResep(${index})">
                📤 Share
            </button>
        </div>
    `;

    return card;
}

// ==========================================
// LOADING & ERROR
// ==========================================
function setLoading(loading) {
    isGenerating = loading;
    const btn = document.getElementById('generateBtn');
    const spinner = document.getElementById('loadingSpinner');

    if (loading) {
        btn.disabled = true;
        btn.innerHTML = '⏳ Sedang Membuat Resep...';
        if (spinner) spinner.classList.remove('hidden');
    } else {
        btn.disabled = false;
        btn.innerHTML = '✨ Generate Resep';
        if (spinner) spinner.classList.add('hidden');
    }
}

function showError(message) {
    const errorEl = document.getElementById('errorMessage');
    if (errorEl) {
        errorEl.textContent = message;
        errorEl.classList.remove('hidden');
    }
}

function hideError() {
    const errorEl = document.getElementById('errorMessage');
    if (errorEl) errorEl.classList.add('hidden');
}

// ==========================================
// HISTORY
// ==========================================
function simpanHistory(bahan, resepList) {
    try {
        const history = JSON.parse(localStorage.getItem('resepHistory') || '[]');
        const entry = {
            id: Date.now(),
            tanggal: new Date().toLocaleString('id-ID'),
            bahan: bahan,
            jumlahResep: resepList.length
        };

        history.unshift(entry);
        if (history.length > 10) history.pop();

        localStorage.setItem('resepHistory', JSON.stringify(history));
        updateHistoryUI();
    } catch (e) {
        console.warn('Gagal menyimpan history:', e);
    }
}

function updateHistoryUI() {
    const container = document.getElementById('historyList');
    if (!container) return;

    const history = JSON.parse(localStorage.getItem('resepHistory') || '[]');

    if (history.length === 0) {
        container.innerHTML = '<p class="empty-text">Belum ada riwayat pencarian</p>';
        return;
    }

    container.innerHTML = history.map(item => `
        <div class="history-item" onclick="loadHistory('${item.bahan}')">
            <div style="font-weight:600; color:#333; font-size:0.9rem;">
                🔍 ${item.bahan}
            </div>
            <div style="font-size:0.75rem; color:#666; margin-top:2px;">
                ${item.tanggal} • ${item.jumlahResep} resep
            </div>
        </div>
    `).join('');
}

function loadHistory(bahan) {
    document.getElementById('bahan').value = bahan;
    generateResep();
}

function clearHistory() {
    if (confirm('Hapus semua riwayat pencarian?')) {
        localStorage.removeItem('resepHistory');
        updateHistoryUI();
    }
}

// ==========================================
// SIMPAN RESEP
// ==========================================
function simpanResep(index) {
    const resep = currentResep[index];
    if (!resep) return;

    try {
        const tersimpan = JSON.parse(localStorage.getItem('resepTersimpan') || '[]');

        if (tersimpan.some(r => r.nama === resep.nama)) {
            alert('⚠️ Resep sudah pernah disimpan!');
            return;
        }

        resep.id = Date.now();
        resep.tanggalSimpan = new Date().toLocaleString('id-ID');
        tersimpan.push(resep);
        localStorage.setItem('resepTersimpan', JSON.stringify(tersimpan));

        // Update tombol
        const btns = document.querySelectorAll('.btn-simpan');
        if (btns[index]) {
            btns[index].innerHTML = '✅ Tersimpan';
            btns[index].disabled = true;
        }

        updateResepTersimpanUI();
        alert('✅ Resep berhasil disimpan!');
    } catch (e) {
        console.error('Gagal menyimpan:', e);
    }
}

function updateResepTersimpanUI() {
    const container = document.getElementById('resepTersimpanList');
    if (!container) return;

    const tersimpan = JSON.parse(localStorage.getItem('resepTersimpan') || '[]');

    if (tersimpan.length === 0) {
        container.innerHTML = '<p class="empty-text">Belum ada resep tersimpan</p>';
        return;
    }

    container.innerHTML = tersimpan.map((resep, index) => `
        <div class="history-item">
            <div style="font-weight:600; color:#333; font-size:0.9rem;">
                🍳 ${resep.nama}
            </div>
            <div style="font-size:0.75rem; color:#666; margin-top:2px;">
                ⏰ ${resep.estimasi_waktu} • ${resep.tanggalSimpan}
            </div>
            <div style="display:flex; gap:6px; margin-top:8px;">
                <button onclick="lihatResepTersimpan(${index})" style="
                    flex:1; padding:5px; background:#1976d2; color:white;
                    border:none; border-radius:6px; cursor:pointer; font-size:0.8rem;">
                    👁️ Lihat
                </button>
                <button onclick="hapusResepTersimpan(${index})" style="
                    flex:1; padding:5px; background:#e53935; color:white;
                    border:none; border-radius:6px; cursor:pointer; font-size:0.8rem;">
                    🗑️ Hapus
                </button>
            </div>
        </div>
    `).join('');
}

function lihatResepTersimpan(index) {
    const tersimpan = JSON.parse(localStorage.getItem('resepTersimpan') || '[]');
    const resep = tersimpan[index];
    if (!resep) return;

    currentResep = [resep];
    displayResep([resep], resep.bahan_digunakan?.join(', ') || '');
}

function hapusResepTersimpan(index) {
    if (!confirm('Hapus resep ini?')) return;

    const tersimpan = JSON.parse(localStorage.getItem('resepTersimpan') || '[]');
    tersimpan.splice(index, 1);
    localStorage.setItem('resepTersimpan', JSON.stringify(tersimpan));
    updateResepTersimpanUI();
}

// ==========================================
// SHARE RESEP
// ==========================================
function shareResep(index) {
    const resep = currentResep[index];
    if (!resep) return;

    const text = `🍳 *${resep.nama}*

⏰ Waktu: ${resep.estimasi_waktu}
🎯 Kesulitan: ${resep.kesulitan}
🍽️ Porsi: ${resep.porsi}

🥘 Bahan:
${resep.bahan_digunakan?.map(b => `• ${b}`).join('\n')}

👨‍🍳 Cara Membuat:
${resep.langkah?.map((l, i) => `${i + 1}. ${l}`).join('\n')}

💡 Tips: ${resep.tips || '-'}

Dibuat dengan ResepAI 🚀`;

    if (navigator.share) {
        navigator.share({ title: resep.nama, text }).catch(() => copyToClipboard(text));
    } else {
        copyToClipboard(text);
    }
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        alert('📋 Resep disalin ke clipboard!');
    }).catch(() => {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        alert('📋 Resep disalin ke clipboard!');
    });
}

// ==========================================
// EVENT LISTENERS & INIT
// ==========================================
document.addEventListener('DOMContentLoaded', function () {
    updateHistoryUI();
    updateResepTersimpanUI();

    const generateBtn = document.getElementById('generateBtn');
    if (generateBtn) {
        generateBtn.addEventListener('click', function(e) {
            e.preventDefault(); // ← Tambah ini!
            generateResep();
        });
    }

    const bahanInput = document.getElementById('bahan');
    if (bahanInput) {
        bahanInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') generateResep();
        });
    }

    const clearHistoryBtn = document.getElementById('clearHistoryBtn');
    if (clearHistoryBtn) {
        clearHistoryBtn.addEventListener('click', clearHistory);
    }
});

// ==========================================
// ERROR HANDLING GLOBAL
// ==========================================
window.onerror = function (msg, url, lineNo, columnNo, error) {
    console.error('Error: ', msg, '\nURL: ', url, '\nLine: ', lineNo);
    return false;
};

window.addEventListener('unhandledrejection', function (event) {
    console.error('Unhandled promise rejection:', event.reason);

});

