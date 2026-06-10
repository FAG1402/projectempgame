// ==========================================
// 1. ENGINE AUTO-SCALER (Menyesuaikan Ukuran Layar)
// ==========================================
function sesuaikanUkuranLayar() {
    const container = document.getElementById('game-container');
    if (!container) return;

    const lebarLayar = window.innerWidth;
    const tinggiLayar = window.innerHeight;
    
    const skalaLebar = lebarLayar / 1920;
    const skalaTinggi = tinggiLayar / 1080;
    const skalaFinal = Math.min(skalaLebar, skalaTinggi);

    const posisiX = (lebarLayar - (1920 * skalaFinal)) / 2;
    const posisiY = (tinggiLayar - (1080 * skalaFinal)) / 2;

    container.style.transformOrigin = '0 0';
    container.style.transform = `translate(${posisiX}px, ${posisiY}px) scale(${skalaFinal})`;
}
window.addEventListener('resize', sesuaikanUkuranLayar);

// ==========================================
// 2. NAVIGASI LAYAR & MENU UMUM
// ==========================================
let layarSebelumnya = 'screen-home'; 

function bukaLayar(idLayarTujuan) {
    const layarAktif = document.querySelector('.screen.active');
    
    if (idLayarTujuan === 'screen-settings' && layarAktif) {
        layarSebelumnya = layarAktif.id;
    }

    document.querySelectorAll('.screen').forEach(layar => {
        layar.classList.remove('active');
        layar.classList.add('hidden');
    });
    
    const layarTujuan = document.getElementById(idLayarTujuan);
    if (layarTujuan) {
        layarTujuan.classList.remove('hidden');
        layarTujuan.classList.add('active');
    }
    
    // PENTING: Menyimpan posisi layar agar saat direfresh tidak kembali ke awal
    saveGame(idLayarTujuan); 
}

function kembaliDariSettings() {
    bukaLayar(layarSebelumnya);
}

function handleMenuAction(action) {
    if (action === "start") {
        // Jika ada data save-an lama di browser, tanyakan pilihan lewat pop-up konfirmasi
        if (localStorage.getItem('project_emp_save_state')) {
            const mauLanjutkan = confirm("Sistem mendeteksi data progres lama.\n\nApakah Anda ingin MELANJUTKAN permainan dari ruangan terakhir?\n(Klik 'Cancel / Batal' untuk menghapus data lama dan MULAI BARU dari awal lobi)");
            
            if (mauLanjutkan) {
                loadGameState(); // Panggil fungsi muat data lama jika pilih OK
            } else {
                localStorage.removeItem('project_emp_save_state'); // Hapus bersih progres lama jika pilih Cancel
                mulaiLoading(); // Mulai game segar dari prolog awal
            }
        } else {
            mulaiLoading(); // Jika memori browser kosong, langsung jalankan game dari awal
        }
    }
    
    // JANGAN HAPUS AKSI DI BAWAH INI AGAR TOMBOL LAIN TETAP BERFUNGSI
    if (action === "settings") bukaLayar('screen-settings');
    if (action === "credits") bukaLayar('screen-credits'); 
    if (action === "achievement") {
        bukaLayar('screen-achievement'); 
        renderAchievements();
    }
}

// ==========================================
// 3. LOGIKA SLIDER SETTINGS & HINT
// ==========================================
['brightness', 'volume', 'music'].forEach(id => {
    const slider = document.getElementById(`slider-${id}`);
    const output = document.getElementById(`val-${id}`);
    if (slider && output) {
        const updateWarnaSlider = (nilai) => {
            slider.style.background = `linear-gradient(to right, rgba(255,255,255,1) 0%, rgba(255,255,255,1) ${nilai}%, rgba(255,255,255,0.45) ${nilai}%, rgba(255,255,255,0.45) 100%)`;
        };
        updateWarnaSlider(slider.value);
        
        slider.addEventListener('input', function() {
            output.innerText = this.value + '%';
            updateWarnaSlider(this.value);

            // --- A. JALANKAN FUNGSI BRIGHTNESS ---
            if (id === 'brightness') {
                // Mengubah tingkat kegelapan seluruh container game secara real-time
                document.getElementById('game-container').style.filter = `brightness(${this.value}%)`;
            }

            // --- B. JALANKAN FUNGSI VOLUME MUSIC (BGM) ---
            if (id === 'music') {
                const volTarget = this.value / 100;
                ['bgm-home', 'bgm-gameplay', 'audio-ending'].forEach(idAudio => {
                    const audioElemen = document.getElementById(idAudio);
                    if (audioElemen) audioElemen.volume = volTarget;
                });
            }

            // --- C. JALANKAN FUNGSI VOLUME MASTER/SFX ---
            if (id === 'volume') {
                const volTarget = this.value / 100;
                const sfxJumpscare = document.getElementById('sfx-jumpscare');
                if (sfxJumpscare) sfxJumpscare.volume = volTarget;
                // Jika nanti ada sfx pintu/tombol tinggal daftarkan ID-nya di sini
            }
        });
    }
});

let statusHint = true; 
function toggleHintFigma() {
    statusHint = !statusHint; 
    const tombolToggle = document.getElementById('btn-toggle-hint');
    const teksStatus = document.getElementById('hint-status');
    if (tombolToggle && teksStatus) {
        if (statusHint) {
            tombolToggle.classList.replace('hint-off', 'hint-on');
            teksStatus.innerText = "ON";
        } else {
            tombolToggle.classList.replace('hint-on', 'hint-off');
            teksStatus.innerText = "OFF";
        }
    }
}

// ==========================================
// 4. LOGIKA LOADING & TYPEWRITER
// ==========================================
const naskahCerita = [
    "Laboratorium Riset Blackridge.\n\nDitinggalkan beberapa bulan lalu akibat rumor gelap tentang eksperimen tak manusiawi.\nKau datang untuk membuktikan kebenaran itu.",
    "[ PERINGATAN: PENYUSUP TERDETEKSI ]\n[ PROTOKOL LOCKDOWN DIAKTIFKAN ]\n\nKau kini terjebak. Dan seiring berjalannya waktu... kau sadar kau tidak sendirian di sini.\nAda sesuatu yang ikut terkurung bersamamu dalam kegelapan.",
    "Kumpulkan bukti. Temukan kunci utama. Cari jalan keluar lain.\n\nDan apa pun yang terjadi... Bersembunyilah jika dia mendekat."
];

let sesiSaatIni = 0;
let isLoadingDone = false, isTextDone = false;

function mulaiLoading() {
    bukaLayar('screen-loading'); 
    let progress = 0; sesiSaatIni = 0; isLoadingDone = false; isTextDone = false;
    const barFill = document.getElementById('loading-fill');
    const textProgress = document.getElementById('loading-text');
    const tombolLanjut = document.getElementById('btn-skip-prologue');
    
    document.querySelector('.loading-ui-container').style.display = 'flex';
    tombolLanjut.classList.add('hidden');
    barFill.style.width = '0%';
    
    const intervalAnimasi = setInterval(() => {
        progress += Math.floor(Math.random() * 5) + 1; 
        if (progress >= 100) {
            progress = 100;
            clearInterval(intervalAnimasi);
            barFill.style.width = '100%';
            textProgress.innerText = `SYSTEM READY... 100%`;
            isLoadingDone = true;
            cekSelesaiFinal(); 
        } else {
            barFill.style.width = progress + '%';
            textProgress.innerText = `INITIALIZING SYSTEM... ${progress}%`;
        }
    }, 1000);
    ketikNaskah();
}

function ketikNaskah() {
    const elemenTeks = document.getElementById('prologue-text');
    elemenTeks.textContent = ""; 
    let teksSesi = naskahCerita[sesiSaatIni];
    let i = 0;
    
    let intervalNgetik = setInterval(() => {
        if (i < teksSesi.length) {
            elemenTeks.textContent += teksSesi.charAt(i);
            i++;
        } else {
            clearInterval(intervalNgetik);
            if (sesiSaatIni < naskahCerita.length - 1) {
                setTimeout(() => { sesiSaatIni++; ketikNaskah(); }, 2500);
            } else {
                isTextDone = true; cekSelesaiFinal();
            }
        }
    }, 50);
}

function cekSelesaiFinal() {
    if (isTextDone && isLoadingDone) {
        document.querySelector('.loading-ui-container').style.display = 'none';
        document.getElementById('btn-skip-prologue').classList.remove('hidden');
    }
}

function masukMap1() { 
    // 1. Matikan BGM Home
    const bgmHome = document.getElementById('bgm-home');
    if (bgmHome) bgmHome.pause();

    // 2. Nyalakan BGM Gameplay
    const bgmGameplay = document.getElementById('bgm-gameplay');
    const sliderMusic = document.getElementById('slider-music');
    if (bgmGameplay) {
        bgmGameplay.volume = sliderMusic ? sliderMusic.value / 100 : 1.0;
        bgmGameplay.play().catch(e => console.log("BGM Gameplay menunggu interaksi"));
    }

    // 3. Masuk ke Map 1
    bukaLayar('screen-map1'); 
}

// ==========================================
// 5. POP-UP GLOBAL & DATABASE MATERI
// ==========================================
function tutupPopup(idElemen) { document.getElementById(idElemen).classList.replace('active-ui', 'hidden-ui'); }
function munculkanPeta() { document.getElementById('popup-map-ui').classList.replace('hidden-ui', 'active-ui'); }
function bukaInventory() { document.getElementById('side-inventory').classList.replace('hidden-ui', 'active-ui'); }
function bukaPauseMenu() { document.getElementById('popup-pause-ui').classList.replace('hidden-ui', 'active-ui'); }
function bukaHideUI() { document.getElementById('popup-hide-ui').classList.replace('hidden-ui', 'active-ui'); }

function munculkanClue(teks) {
    document.getElementById('teks-clue').innerText = teks;
    document.getElementById('popup-clue-ui').classList.replace('hidden-ui', 'active-ui');
}

function picuJumpscare() {
    const popup = document.getElementById('popup-jumpscare');
    const suara = document.getElementById('sfx-jumpscare');

    popup.classList.remove('hidden-ui');
    popup.classList.add('active-ui');
    
    unlockAchievement("achiev-5"); // <--- Memicu Trophy Monster
    
    if (suara) {
        suara.currentTime = 0; 
        suara.play();
    }

    setTimeout(() => {
        popup.classList.remove('active-ui');
        popup.classList.add('hidden-ui');
    }, 1500);
}

const databaseMateri = {
    'ohm-kirchhoff': {
        title: "Hukum Dasar Elektronika",
        content: "1. Hukum Ohm: V = I × R\n2. Hukum Kirchhoff: Arus masuk = Arus keluar.\n\nCatatan: Stabilkan sirkuit agar tidak korsleting."
    },
    'rumus-matematika': {
        title: "Logaritma & Matriks Dasar",
        content: "Sistem enkripsi pintu menggunakan perhitungan dasar.\n\nCatatan Tulisan Tangan:\n'Ingat urutan operasi KABATAKU. Jika X = 8 dan Y = 7, perhatikan nilai Z-nya!'"
    },
    'rumus-fisika': {
        title: "Dinamika Gaya & Gravitasi",
        content: "Sensor hidrolik bergantung pada beban.\nRumus: W = m × g (Gaya = massa × gravitasi).\n\nCatatan:\n'Percepatan gravitasi bumi (g) adalah 10 m/s². Jangan sampai sistem kelebihan beban!'"
    }
};

function tampilkanMateri(materiID) {
    const data = databaseMateri[materiID];
    if (data) {
        munculkanClue(`[ ${data.title.toUpperCase()} ]\n\n${data.content}`);
    }
}

// ==========================================
// 6. SISTEM INVENTORY & PENGUMPULAN DOKUMEN
// ==========================================
let inventoryPemain = [];
let dokumenTerkumpul = []; 
let koleksiKunciKhusus = []; 
// PERBAIKAN: Huruf kecil semua agar sinkron dengan fungsi reward mini-game
const KUNCI_DIBUTUHKAN = ["kunci fasa", "kunci netral", "kunci ground"]; 

function ambilItem(idItem, gambarSrc, deskripsi) {
    if (inventoryPemain.some(item => item.id === idItem)) return; 
    inventoryPemain.push({ id: idItem, src: gambarSrc, type: 'item', desc: deskripsi });
    renderInventoryUI();
    const elemenMap = document.getElementById(`item-${idItem}`);
    if (elemenMap) elemenMap.style.display = 'none';
    munculkanClue(`Mendapatkan item: ${idItem.toUpperCase()}! Cek Inventory.`);
    saveGame();
}

function beriKunci(namaKunci) {
    if (!koleksiKunciKhusus.includes(namaKunci)) {
        koleksiKunciKhusus.push(namaKunci);
        munculkanClue(`BERHASIL! Kamu mendapatkan ${namaKunci.toUpperCase()}. (${koleksiKunciKhusus.length}/3)`);
        
        // PENTING: Menyimpan status array kunci secara langsung
        saveGame(); 
    } else {
        munculkanClue("Tantangan ini sudah selesai.");
    }
}

function cobaBukaPintuFinal() {
    const punyaSemua = KUNCI_DIBUTUHKAN.every(kunci => koleksiKunciKhusus.includes(kunci));
    if (punyaSemua) {
        munculkanClue("Sirkuit daya utama aktif! Gerbang pelarian menuju area luar terbuka.");
        bukaLayar('screen-final-door'); // Pindah ke selasar pintu luar terlebih dahulu
    } else {
        const belumAda = KUNCI_DIBUTUHKAN.filter(kunci => !koleksiKunciKhusus.includes(kunci));
        munculkanClue("Sistem interlock aktif! Pintu keluar terkunci. Butuh: " + belumAda.join(", ").toUpperCase());
    }
}

function jalankanEndingSelesai() {
    unlockAchievement("achiev-6");

    // 1. Hapus data save state gameplay agar bisa reset bersih saat main lagi
    localStorage.removeItem('project_emp_save_state'); 

    // 2. Matikan BGM Gameplay Utama
    const bgmGameplay = document.getElementById('bgm-gameplay');
    if (bgmGameplay) bgmGameplay.pause();

    // 3. Putar Lagu Ending "落淚"
    const audioEnding = document.getElementById('audio-ending');
    const sliderMusic = document.getElementById('slider-music');
    if (audioEnding) {
        audioEnding.volume = sliderMusic ? sliderMusic.value / 100 : 0.7;
        audioEnding.play().catch(e => console.error("Gagal memutar musik ending:", e));
    }

    // 4. Buka Layar Keluar Akhir & Jalankan Animasi Teks Mesin Tik
    bukaLayar('screen-ending');
    ketikEnding(); 
}

// --- FUNGSI BARU: TYPEWRITER ANIMASI TEKS ENDING ---
function ketikEnding() {
    const elemenTeks = document.getElementById('ending-text');
    const elemenTombol = document.getElementById('ending-buttons');
    if (!elemenTeks) return;

    // Reset konten teks dan pastikan tombol tersembunyi saat animasi dimulai
    elemenTeks.innerHTML = "";
    if (elemenTombol) elemenTombol.classList.add('hidden-ui');

    // Naskah narasi tamat (\n digunakan untuk baris baru)
    const teksEnding = `Kamu berhasil mengaktifkan seluruh sirkuit daya utama dan melangkah keluar.\nUdara malam yang dingin menyambutmu di luar Fasilitas Blackridge.\nBukti eksperimen rahasia "Project E.M.P" kini aman di dalam genggamanmu.\n\nKamu selamat dari kegelapan...`;
    
    let i = 0;
    let intervalNgetik = setInterval(() => {
        if (i < teksEnding.length) {
            // Jika mendeteksi tanda enter (\n), ubah menjadi tag HTML break <br>
            if (teksEnding.charAt(i) === '\n') {
                elemenTeks.innerHTML += '<br>';
            } else {
                elemenTeks.innerHTML += teksEnding.charAt(i);
            }
            i++;
        } else {
            // Matikan timer ketika teks sudah habis diketik semuanya
            clearInterval(intervalNgetik);
            
            // Munculkan tombol aksi dengan efek transisi halus
            if (elemenTombol) {
                elemenTombol.classList.remove('hidden-ui');
                elemenTombol.style.opacity = "0";
                elemenTombol.style.transition = "opacity 1s ease-in-out";
                setTimeout(() => { elemenTombol.style.opacity = "1"; }, 50);
            }
        }
    }, 50); // Kecepatan ketik 50ms per karakter (sama dengan sistem kecepatan prolog)
}

// --- FUNGSI BARU: TYPEWRITER ANIMASI TEKS ENDING ---
function ketikEnding() {
    const elemenTeks = document.getElementById('ending-text');
    const elemenTombol = document.getElementById('ending-buttons');
    if (!elemenTeks) return;

    // Reset konten teks dan pastikan tombol tersembunyi saat animasi dimulai
    elemenTeks.innerHTML = "";
    if (elemenTombol) elemenTombol.classList.add('hidden-ui');

    // Naskah narasi tamat (\n digunakan untuk baris baru)
    const teksEnding = `Kamu berhasil mengaktifkan seluruh sirkuit daya utama dan melangkah keluar.\nUdara malam yang dingin menyambutmu di luar Fasilitas Blackridge.\nBukti eksperimen rahasia "Project E.M.P" kini aman di dalam genggamanmu.\n\nKamu selamat dari kegelapan...`;
    
    let i = 0;
    let intervalNgetik = setInterval(() => {
        if (i < teksEnding.length) {
            // Jika mendeteksi tanda enter (\n), ubah menjadi tag HTML break <br>
            if (teksEnding.charAt(i) === '\n') {
                elemenTeks.innerHTML += '<br>';
            } else {
                elemenTeks.innerHTML += teksEnding.charAt(i);
            }
            i++;
        } else {
            // Matikan timer ketika teks sudah habis diketik semuanya
            clearInterval(intervalNgetik);
            
            // Munculkan tombol aksi dengan efek transisi halus
            if (elemenTombol) {
                elemenTombol.classList.remove('hidden-ui');
                elemenTombol.style.opacity = "0";
                elemenTombol.style.transition = "opacity 1s ease-in-out";
                setTimeout(() => { elemenTombol.style.opacity = "1"; }, 50);
            }
        }
    }, 50); // Kecepatan ketik 50ms per karakter (sama dengan sistem kecepatan prolog)
}

function ambilDokumen(idDoc, isiTeksCerita) {
    if (!dokumenTerkumpul.includes(isiTeksCerita)) {
        dokumenTerkumpul.push(isiTeksCerita);
    }
    const adaKertas = inventoryPemain.some(item => item.id === 'kertas_jurnal');
    if (!adaKertas) {
        inventoryPemain.push({ id: 'kertas_jurnal', src: 'assets/items/document.png', type: 'dokumen', desc: 'Kumpulan Dokumen' });
        renderInventoryUI();
    }
    const elemenMap = document.getElementById(idDoc);
    if (elemenMap) elemenMap.style.display = 'none';
    munculkanClue(`Mendapatkan dokumen rahasia. Data telah ditambahkan ke berkas di Inventory.`);
    saveGame();
    cekAchievementKolektor();
}

function bukaCCTV() {
    document.getElementById('popup-cctv-ui').classList.replace('hidden-ui', 'active-ui');
}

// 1. FUNGSI UNTUK LAB FISIKA & ELEKTRO (Kunci Matematika dihapus dari sini)
function ambilKunciLab() {
    if (inventoryPemain.some(item => item.id === 'kunci-fisika')) return;

    inventoryPemain.push({ id: 'kunci-fisika', src: 'assets/items/idcard-physician.png', type: 'item', desc: 'Kunci Akses: Laboratorium Fisika. Labelnya sedikit pudar.' });
    inventoryPemain.push({ id: 'kunci-elektro', src: 'assets/items/idcard-engineer.png', type: 'item', desc: 'Kunci Akses: Laboratorium Elektronika. Ada noda gelap di gagangnya.' });

    renderInventoryUI(); 
    const elemenMap = document.getElementById('item-kunci-lab');
    if (elemenMap) elemenMap.style.display = 'none';
    munculkanClue("Mendapatkan Kunci Akses Laboratorium! Cek Inventory.");
    saveGame();
}

// 2. FUNGSI BARU KHUSUS KUNCI MATEMATIKA (Yang berdarah dari Archive Room)
function ambilKunciMatematika() {
    // Cek agar tidak duplikat
    if (inventoryPemain.some(item => item.id === 'kunci-matematika')) return;

    inventoryPemain.push({id: 'kunci-matematika', src: 'assets/items/idcard-math.png', type: 'item', desc: 'ID Card Akses Lab Matematika. Terlihat sedikit berdarah.' });

    renderInventoryUI(); 
    // Menyembunyikan ikon di Map 2 (Archive Room) setelah diambil
    const elemenMap = document.getElementById('item-idcard');
    if (elemenMap) elemenMap.style.display = 'none';
    munculkanClue("Mendapatkan Kunci Akses Lab Matematika! Cek Inventory.");
    saveGame();
}

// PERBAIKAN: Fungsi baru untuk mengambil Kunci Chamber di Lab Elektro
function ambilKunciChamber() {
    if (inventoryPemain.some(item => item.id === 'kunci-chamber')) return;
    
    inventoryPemain.push({ id: 'kunci-chamber', src: 'assets/items/scientist.png', type: 'item', desc: 'Kunci Akses: Experiment Chamber.' });
    renderInventoryUI();
    
    const elemenMap = document.getElementById('item-kunci-chamber');
    if (elemenMap) elemenMap.style.display = 'none';
    munculkanClue("Mendapatkan Kunci Akses: Chamber! Cek Inventory.");
    saveGame();
}

function renderInventoryUI() {
    const semuaSlot = document.querySelectorAll('.side-inv-slot');
    semuaSlot.forEach(slot => { slot.innerHTML = ""; slot.onclick = null; });

    inventoryPemain.forEach((item, index) => {
        if (semuaSlot[index]) {
            semuaSlot[index].innerHTML = `<img src="${item.src}" alt="${item.id}" style="width:75%; height:75%; object-fit:contain; margin:12.5%; cursor:pointer;">`;
            semuaSlot[index].onclick = function() {
                if (item.type === 'dokumen') {
                    bukaJurnalDokumen(); 
                } else {
                    munculkanClue(`[ ${item.id.toUpperCase()} ]\n${item.desc}`); 
                }
            };
        }
    });
}

// Membuka UI Terminal
function bukaTerminal() {
    const area = document.getElementById('terminal-area');
    const status = document.getElementById('terminal-status');
    const tombol = document.getElementById('btn-hack');

    // Cek apakah data sudah diambil sebelumnya
    if (inventoryPemain.some(item => item.id === 'flashdisk-data')) {
        status.innerText = "Data sudah tersalin.";
        tombol.style.display = 'none';
    } else {
        status.innerText = "Status: Menunggu Flashdisk...";
        tombol.style.display = 'block';
    }
    document.getElementById('popup-terminal-ui').classList.replace('hidden-ui', 'active-ui');
}

// Logika Proses Hacking
function prosesHack() {
    const status = document.getElementById('terminal-status');
    const tombol = document.getElementById('btn-hack');
    
    if (!inventoryPemain.some(item => item.id === 'flashdisk')) {
        status.innerText = "ERROR: NO DRIVE DETECTED!";
        return;
    }

    // Animasi simulasi download
    tombol.style.display = 'none';
    status.innerText = "ACCESSING ENCRYPTED DATA...";
    
    setTimeout(() => {
        status.innerText = "DOWNLOADING: [#####-----] 50%";
    }, 1000);
    
    setTimeout(() => {
        status.innerText = "TRANSFER COMPLETE: 100%";
        // Jalankan logika penyimpanan flashdisk seperti biasa
        const index = inventoryPemain.findIndex(item => item.id === 'flashdisk');
        inventoryPemain[index] = { 
            id: 'flashdisk-data', 
            src: 'assets/items/flashdisk-full.png', 
            type: 'item', 
            desc: 'Flashdisk berisi bukti eksperimen rahasia Blackridge.' 
        };
        renderInventoryUI();
        cekAchievementKolektor();
    }, 2500);
}

function bukaJurnalDokumen() {
    const wadahTeks = document.getElementById('daftar-dokumen-container');
    wadahTeks.innerHTML = ""; 

    if (dokumenTerkumpul.length === 0) {
        wadahTeks.innerHTML = "<p>Belum ada data yang dikumpulkan.</p>";
    } else {
        dokumenTerkumpul.forEach((teks, i) => {
            wadahTeks.innerHTML += `<div style="margin-bottom: 25px; border-left: 4px solid red; padding-left: 15px;">
                <span style="color: #ff4444; font-weight: bold;">[ DATA 00${i+1} ]</span><br>${teks}
            </div>`;
        });
    }
    document.getElementById('popup-dokumen-ui').classList.replace('hidden-ui', 'active-ui');
}

// PERBAIKAN: Fungsi buka pintu dengan feedback yang lebih jelas
function cobaBukaPintu(labName, keyId, targetScreenId, elementId) {
    const keyIndex = inventoryPemain.findIndex(item => item.id === keyId);

    if (keyIndex !== -1) {
        // Kode ini MENGHAPUS item dari array inventory
        inventoryPemain.splice(keyIndex, 1); 
        renderInventoryUI(); 
        
        const pintu = document.getElementById(elementId);
        pintu.classList.remove('icon-locked');
        pintu.classList.add('icon-open');
        
        // Teks diperjelas agar pemain sadar kuncinya sudah dikonsumsi/hilang dari tas
        munculkanClue(`Akses Diterima! Pintu ${labName} terbuka dan ID Card telah digunakan.`);
        pintu.onclick = function() { bukaLayar(targetScreenId); };
    } else {
        munculkanClue(`Pintu ${labName} terkunci rapat. Sepertinya butuh kunci khusus.`);
    }
    saveGame();
}

// ==========================================
// 7. DRAG TO SCROLL (MAP 1 PANORAMA)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const scrollArea = document.getElementById('map-scroll-area');
    if (!scrollArea) return;

    let isDown = false; let startX; let scrollLeft;

    scrollArea.addEventListener('mousedown', (e) => {
        isDown = true; startX = e.pageX - scrollArea.offsetLeft; scrollLeft = scrollArea.scrollLeft;
    });
    scrollArea.addEventListener('mouseleave', () => { isDown = false; });
    scrollArea.addEventListener('mouseup', () => { isDown = false; });
    scrollArea.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        e.preventDefault();
        const x = e.pageX - scrollArea.offsetLeft;
        scrollArea.scrollLeft = scrollLeft - ((x - startX) * 1.5);
    });
});

// ==========================================
// 8. LOGIKA ACHIEVEMENT SCREEN
// ==========================================
// --- FUNGSI BARU: TRIGGER UNLOCK ACHIEVEMENT ---
function unlockAchievement(id) {
    const achiev = dataAchievement.find(a => a.id === id);
    if (achiev && !achiev.isUnlocked) {
        achiev.isUnlocked = true;
        
        // 1. Munculkan Toast Pop-up Melayang
        tampilkanToastAchievement(achiev.title, achiev.desc);
        
        // 2. Render ulang UI menu trophy jika sedang dibuka
        renderAchievements();
        
        // 3. Autosave data achievement terbaru
        saveGame();
    }
}

// Fungsi khusus untuk mengecek apakah semua berkas rahasia sudah terkumpul
function cekAchievementKolektor() {
    // Berkas rahasia totalnya ada 5 di game kamu (1 flashdisk data + 4 dokumen teks)
    const punyaFlashdiskData = inventoryPemain.some(item => item.id === 'flashdisk-data');
    const totalDokumen = dokumenTerkumpul.length; // Menghitung isi array dokumen

    // Jika flashdisk sudah di-download DAN 4 dokumen map sudah dibaca
    if (punyaFlashdiskData && totalDokumen >= 4) {
        unlockAchievement("achiev-4");
    }
}

// --- FUNGSI BARU: GENERATE TOAST NOTIFIKASI SECARA DINAMIS ---
function tampilkanToastAchievement(title, desc) {
    const toast = document.createElement('div');
    toast.className = 'achievement-toast';
    toast.innerHTML = `
        <div class="toast-trophy-icon">🏆</div>
        <div class="toast-text-box">
            <span class="toast-alert-title">ACHIEVEMENT UNLOCKED!</span>
            <span class="toast-game-title">${title}</span>
        </div>
    `;
    document.getElementById('game-container').appendChild(toast);

    // Animasi Hilang setelah 3.5 detik
    setTimeout(() => {
        toast.classList.add('toast-fadeout');
        setTimeout(() => toast.remove(), 500);
    }, 3500);
}

// --- FUNGSI BARU: AUTOSAVE SYSTEM ---
function saveGame(idLayarManual = null) {
    const layarSekarang = idLayarManual || document.querySelector('.screen.active')?.id || 'screen-map1';
    
    // Simpan data trophy permanen secara terpisah
    const dataTrophy = dataAchievement.map(a => ({ id: a.id, isUnlocked: a.isUnlocked }));
    localStorage.setItem('project_emp_achievements', JSON.stringify(dataTrophy));

    // Jangan simpan data map jika pemain berada di layar menu utama/credit/ending
    if (['screen-home', 'screen-loading', 'screen-settings', 'screen-credits', 'screen-achievement', 'screen-ending'].includes(layarSekarang)) {
        return;
    }

    // Simpan progress gameplay aktif
    const progressGameplay = {
        inventory: inventoryPemain,
        dokumen: dokumenTerkumpul,
        kunciKhusus: koleksiKunciKhusus,
        screen: layarSekarang
    };
    localStorage.setItem('project_emp_save_state', JSON.stringify(progressGameplay));
}

// --- FUNGSI BARU: LOAD GAME SYSTEM ---
function loadAchievementsOnly() {
    const savedTrophy = localStorage.getItem('project_emp_achievements');
    if (savedTrophy) {
        const listSaved = JSON.parse(savedTrophy);
        listSaved.forEach(savedA => {
            const originalA = dataAchievement.find(a => a.id === savedA.id);
            if (originalA) originalA.isUnlocked = savedA.isUnlocked;
        });
    }
}

function loadGameState() {
    const savedState = localStorage.getItem('project_emp_save_state');
    if (savedState) {
        const gameState = JSON.parse(savedState);
        inventoryPemain = gameState.inventory || [];
        dokumenTerkumpul = gameState.dokumen || [];
        koleksiKunciKhusus = gameState.kunciKhusus || [];
        
        renderInventoryUI();
        renderAchievements();
        
        // Langsung lompat ke map terakhir tempat pemain keluar game
        if (gameState.screen) {
            bukaLayar(gameState.screen);
            
            // Matikan musik utama home, nyalakan musik gameplay
            const bgmHome = document.getElementById('bgm-home');
            if (bgmHome) bgmHome.pause();
            const bgmGameplay = document.getElementById('bgm-gameplay');
            if (bgmGameplay) bgmGameplay.play().catch(() => {});
        }
    }
}

const dataAchievement = [
    { id: "achiev-1", isUnlocked: false, title: "Math Master", desc: "Berhasil memecahkan teka-teki kode matematika tanpa kesalahan.", posClass: "pos-card-1", panelSrc: "assets/button/click/button_square_flat.png", iconSrc: "assets/vector-free-math-vectors-ai.jpg", iconClass: "icon-1" },
    { id: "achiev-2", isUnlocked: false, title: "Are You Engineer?", desc: "Memperbaiki dan meretas panel elektronika utama untuk membuka jalan.", posClass: "pos-card-2", panelSrc: "assets/button/click/button_square_flat.png", iconSrc: "assets/animated-gear-setting-icon-clipart-illustration-on-white-background-vector.jpg", iconClass: "icon-2" },
    { id: "achiev-3", isUnlocked: false, title: "A Yo!! Albert Einstein", desc: "Menyelesaikan teka-teki teori fisika ruang karantina dengan sempurna.", posClass: "pos-card-3", panelSrc: "assets/button/click/button_square_flat.png", iconSrc: "assets/95b238d965d6b8953fb96dbe3ac3bd5e.jpg", iconClass: "icon-3" },
    { id: "achiev-4", isUnlocked: false, title: "Nice Catch!", desc: "Mengumpulkan seluruh data rahasia Project E.M.P dan bukti eksperimen.", posClass: "pos-card-4", panelSrc: "assets/button/click/button_square_flat.png", iconSrc: "assets/medals/shaded_medal1.png", iconClass: "icon-4" },
    { id: "achiev-5", isUnlocked: false, title: "Being Part of Them", desc: "Tertangkap oleh makhluk eksperimen dan gagal keluar dari fasilitas.", posClass: "pos-card-5", panelSrc: "assets/button/click/button_square_flat.png", iconSrc: "assets/terror.png", iconClass: "icon-5" },
    { id: "achiev-6", isUnlocked: false, title: "Bye-bye ugly monster", desc: "Berhasil keluar dari fasilitas Blackridge hidup-hidup.", posClass: "pos-card-6", panelSrc: "assets/button/click/button_square_flat.png", iconSrc: "assets/emergency-exit-green-sign-isolate-on-white-background-illustration-eps-10-free-vector.jpg", iconClass: "icon-6" }
];

function renderAchievements() {
    const wadah = document.getElementById('achievement-list');
    if (!wadah) return;
    wadah.innerHTML = ""; 

    dataAchievement.forEach(item => {
        const statusClass = item.isUnlocked ? "" : "locked";
        const judul = item.isUnlocked ? item.title : "Locked";
        const deskripsi = item.isUnlocked ? item.desc : "Selesaikan tantangan untuk membuka ini.";

        wadah.innerHTML += `
            <article class="achievement-card ${item.posClass} ${statusClass}" id="${item.id}">
                <img class="achiev-panel" src="${item.panelSrc}" alt="Panel Background">
                <img class="achiev-icon ${item.iconClass}" src="${item.iconSrc}" alt="Icon">
                <div class="achiev-text">
                    <h2>${judul}</h2>
                    <p>${deskripsi}</p>
                </div>
            </article>`;
    });
}

// ==========================================
// 9. MINI-GAMES & QUIZ LOGIC
// ==========================================
let selectedWire = null;
let wiringPairs = 0;

// --- A. Wiring Game (Lab Elektronika -> Reward: Kunci Fasa) ---
// PERBAIKAN: Integrasi HTML untuk UI Sirkuit yang Estetis
function bukaWiringGame() {
    document.getElementById('quiz-title').innerText = "HUBUNGKAN SIRKUIT";
    const area = document.getElementById('quiz-area');
    wiringPairs = 0; selectedWire = null;

    area.innerHTML = `
        <div class="wiring-game-container">
            <div class="wiring-board">
                <div class="wire-side left-side">
                    <div class="terminal"><span class="label">A1</span><div class="wire" data-color="red" onclick="selectWire(this)"></div></div>
                    <div class="terminal"><span class="label">A2</span><div class="wire" data-color="blue" onclick="selectWire(this)"></div></div>
                    <div class="terminal"><span class="label">A3</span><div class="wire" data-color="yellow" onclick="selectWire(this)"></div></div>
                </div>
                <div class="wire-side right-side">
                    <div class="terminal"><div class="wire" data-color="yellow" onclick="selectWire(this)"></div><span class="label">B1</span></div>
                    <div class="terminal"><div class="wire" data-color="red" onclick="selectWire(this)"></div><span class="label">B2</span></div>
                    <div class="terminal"><div class="wire" data-color="blue" onclick="selectWire(this)"></div><span class="label">B3</span></div>
                </div>
            </div>
        </div>`;
    document.getElementById('popup-quiz-ui').classList.replace('hidden-ui', 'active-ui');
}

function selectWire(el) {
    if (el.classList.contains('connected')) return;
    if (!selectedWire) {
        selectedWire = el; selectedWire.classList.add('selected');
    } else {
        if (selectedWire.dataset.color === el.dataset.color && selectedWire !== el) {
            selectedWire.classList.remove('selected');
            selectedWire.classList.add('connected');
            el.classList.add('connected');
            selectedWire = null; wiringPairs++;
            if (wiringPairs === 3) {
                tutupPopup('popup-quiz-ui');
                beriKunci("kunci fasa");
                unlockAchievement("achiev-2"); // <--- Memicu Trophy Engineer
            }
        } else {
            munculkanClue("Korsleting! Kabel salah sambung.");
            selectedWire.classList.remove('selected');
            selectedWire = null;
            tutupPopup('popup-quiz-ui');
            picuJumpscare();
        }
    }
}

// --- B. Game Matematika (Lab Matematika -> Reward: Kunci Ground) ---
function bukaMathGame() {
    document.getElementById('quiz-title').innerText = "KALIBRASI MATEMATIKA";
    const area = document.getElementById('quiz-area');
    area.innerHTML = `
        <div style="text-align:center; width:100%;">
            <p style="color:white; margin-bottom:15px; font-size: 24px;">Pecahkan kode akses matriks ini:</p>
            <p style="color:#ffcb00; margin-bottom:20px; font-size: 28px; font-family: monospace;">
                Jika X = 8, dan Y = 7<br>
                Z = (X * Y) - 14
            </p>
            <p style="color:white; margin-bottom:10px; font-size: 20px;">Masukkan nilai Z:</p>
            <input type="number" id="input-math" style="width: 150px; height: 40px; font-size: 24px; text-align: center; font-family: 'Courier New'; font-weight: bold;">
            <br><br>
            <button class="btn-quiz" onclick="cekMath()" style="width: 200px;">INPUT KODE</button>
        </div>
    `;
    document.getElementById('popup-quiz-ui').classList.replace('hidden-ui', 'active-ui');
}

function cekMath() {
    const jawaban = document.getElementById('input-math').value;
    if (jawaban === "42") {
        tutupPopup('popup-quiz-ui');
        beriKunci("kunci ground");
        unlockAchievement("achiev-1"); // <--- Memicu Trophy Matematika
    } else {
        munculkanClue("Akses Ditolak! Perhitungan matematika salah.");
        tutupPopup('popup-quiz-ui');
        picuJumpscare();
    }
}

// --- C. Game Fisika (Lab Fisika -> Reward: Kunci Netral) ---
function bukaPhysicsGame() {
    document.getElementById('quiz-title').innerText = "HYDRAULIC PRESSURE CALIBRATION";
    const area = document.getElementById('quiz-area');
    
    // Injeksi HTML interaktif dengan tema monitor Lab Fisika
    area.innerHTML = `
        <div class="physics-game-container">
            <div class="scanline"></div>
            <div class="physics-monitor">
                <p class="physics-instruction">SYSTEM STATUS: LOCKDOWN ACTIVE</p>
                <div class="physics-formula-box">
                    <span class="formula-title">FORMULA REQUIRED:</span>
                    <code class="formula-text">W = m &times; g</code>
                    <div class="physics-data">
                        <p>> DOOR MASS (m): <span class="highlight-blue">25 KG</span></p>
                        <p>> GRAVITY ACCELERATION (g): <span class="highlight-blue">10 M/S²</span></p>
                    </div>
                </div>
                <div class="physics-input-area">
                    <label for="input-physics">> CALCULATE REQUIRED FORCE (W) IN NEWTON:</label>
                    <div class="input-row">
                        <input type="number" id="input-physics" placeholder="???" autocomplete="off">
                        <span class="unit-text">N</span>
                    </div>
                </div>
                <button class="btn-physics-submit" onclick="cekPhysics()">ENGAGE HYDRAULIC SYSTEM</button>
            </div>
        </div>
    `;
    document.getElementById('popup-quiz-ui').classList.replace('hidden-ui', 'active-ui');
}

function cekPhysics() {
    const jawaban = document.getElementById('input-physics').value;
    if (jawaban === "250") {
        tutupPopup('popup-quiz-ui');
        beriKunci("kunci netral");
        unlockAchievement("achiev-3"); // <--- Memicu Trophy Fisika
    } else {
        munculkanClue("Sistem Kelebihan Beban! Gaya (Newton) tidak sesuai.");
        tutupPopup('popup-quiz-ui');
        picuJumpscare();
    }
}

// ==========================================
// 10. LOGIKA AUDIO & INISIALISASI
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    sesuaikanUkuranLayar();
    renderAchievements();

    const bgmHome = document.getElementById('bgm-home');
    const sliderMusic = document.getElementById('slider-music');

    // Memicu BGM Home berputar saat pertama kali user klik di area homepage
    function mulaiBGMHome() {
        if (bgmHome && bgmHome.paused) {
            bgmHome.volume = sliderMusic ? sliderMusic.value / 100 : 1.0; 
            bgmHome.play().catch(() => console.log("Menunggu interaksi pengguna untuk BGM Home..."));
        }
    }
    document.addEventListener('click', mulaiBGMHome, { once: true });

    // Hubungkan slider settings agar otomatis mengontrol volume ketiga audio sekaligus
    if (sliderMusic) {
        sliderMusic.addEventListener('input', function() { 
            const volumeTarget = this.value / 100;
            ['bgm-home', 'bgm-gameplay', 'audio-ending'].forEach(idAudio => {
                const audioElemen = document.getElementById(idAudio);
                if (audioElemen) audioElemen.volume = volumeTarget;
            });
        });
    }
});