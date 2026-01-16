// components/call-notifier.js
class CallNotifier extends HTMLElement {
    async connectedCallback() {
        // Fix: Improved path check to handle GitHub Pages subfolders
        const currentPath = window.location.pathname;
        if (currentPath.endsWith('calls.html')) {
            if (new URLSearchParams(window.location.search).has('callId')) {
                this.remove();
                return;
            }
        }

        await this.loadDependencies();
        this.render();
        this.init();
        this.initSwipe();
        this.unlockAudio(); 
    }

    unlockAudio() {
        const unlock = () => {
            const tone = this.querySelector('#n-tone');
            if (tone) {
                tone.play().then(() => {
                    tone.pause();
                    tone.currentTime = 0;
                }).catch(() => {});
            }
            document.removeEventListener('touchstart', unlock);
            document.removeEventListener('click', unlock);
        };
        document.addEventListener('touchstart', unlock);
        document.addEventListener('click', unlock);
    }

    async loadDependencies() {
        const scripts = [
            'https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js',
            'https://www.gstatic.com/firebasejs/8.10.1/firebase-auth.js',
            'https://www.gstatic.com/firebasejs/8.10.1/firebase-database.js'
        ];
        for (const src of scripts) {
            if (!document.querySelector(`script[src="${src}"]`)) {
                await new Promise(res => {
                    const s = document.createElement('script');
                    s.src = src; 
                    s.onload = res;
                    s.onerror = res;
                    document.head.appendChild(s);
                });
            }
        }
    }

    render() {
        this.innerHTML = `
        <style>
            #notif-banner {
                position: fixed; 
                top: -250px; 
                left: 50%; 
                transform: translateX(-50%);
                width: calc(100% - 24px); 
                max-width: 420px;
                background: #1c272e; 
                backdrop-filter: blur(25px);
                -webkit-backdrop-filter: blur(25px);
                border: 1px solid rgba(0, 210, 255, 0.3); 
                border-radius: 28px;
                padding: 14px 18px; 
                display: flex; 
                align-items: center; 
                justify-content: space-between;
                z-index: 2147483647;
                box-shadow: 0 20px 50px rgba(0,0,0,0.9);
                transition: top 0.7s cubic-bezier(0.19, 1, 0.22, 1), transform 0.1s linear, opacity 0.3s;
                font-family: -apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                touch-action: none; 
                user-select: none;
                visibility: hidden;
            }
            #notif-banner.active { 
                top: 15px; 
                visibility: visible;
            }
            .c-prof { display: flex; align-items: center; gap: 12px; color: white; flex: 1; }
            .c-pfp { width: 48px; height: 48px; border-radius: 50%; object-fit: cover; border: 2px solid #00d2ff; background: #000; }
            .c-det h4 { margin: 0; font-size: 1rem; font-weight: 700; display: flex; align-items: center; gap: 6px; }
            .c-det p { margin: 2px 0 0; font-size: 0.75rem; color: #00d2ff; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; }
            .v-chk { 
                width: 15px; height: 15px; background: #0095f6; display: inline-block;
                -webkit-mask: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M22.5 12.5c0-1.58.8-3.04 2.12-4.03l-1.1-2.48-2.74.05a4.95 4.95 0 0 1-4.04-2.12L14.24 3l-2.47 1.1-1.1-2.48-2.5.78L7.1 5.14a4.95 4.95 0 0 1-4.04 2.12l-2.74-.05-1.1 2.48 2.12 4.03-2.12 4.03 1.1 2.48 2.74-.05a4.95 4.95 0 0 1 4.04 2.12L9.76 21l2.47-1.1 1.1 2.48 2.5-.78.78-2.73a4.95 4.95 0 0 1 4.04-2.12l2.74.05 1.1-2.48-2.12-4.03Z"/></svg>') no-repeat center;
                mask-size: contain; -webkit-mask-size: contain; 
            }
            .n-btns { display: flex; gap: 10px; }
            .n-btn { border: none; padding: 12px 20px; border-radius: 16px; font-size: 0.85rem; font-weight: 800; cursor: pointer; transition: 0.2s; }
            .n-dec { background: rgba(255, 68, 68, 0.2); color: #ff4444; }
            .n-ans { background: #1ebea5; color: #fff; box-shadow: 0 4px 15px rgba(30, 190, 165, 0.4); }
        </style>
        <div id="notif-banner">
            <div class="c-prof">
                <img src="" class="c-pfp" id="n-img">
                <div class="c-det">
                    <h4 id="n-user">User <span id="n-v"></span></h4>
                    <p id="n-msg">Incoming Call...</p>
                </div>
            </div>
            <div class="n-btns">
                <button class="n-btn n-dec" id="n-dec">Decline</button>
                <button class="n-btn n-ans" id="n-ans">Answer</button>
            </div>
            <audio id="n-tone" loop preload="auto">
                <source src="https://assets.mixkit.co/active_storage/sfx/1359/1359-preview.mp3" type="audio/mpeg">
            </audio>
        </div>`;
    }

    init() {
        const check = setInterval(() => {
            // Fix: Check for both firebase object and initialized apps
            if (typeof firebase !== 'undefined' && firebase.apps.length > 0 && firebase.auth().currentUser) {
                clearInterval(check);
                this.listen();
            }
        }, 1000);
    }

    initSwipe() {
        const banner = this.querySelector('#notif-banner');
        let startY = 0; 
        let currentY = 0;

        banner.addEventListener('touchstart', (e) => {
            startY = e.touches[0].clientY;
        }, { passive: true });

        banner.addEventListener('touchmove', (e) => {
            currentY = e.touches[0].clientY - startY;
            if (currentY < 0) {
                banner.style.transform = `translateX(-50%) translateY(${currentY}px)`;
                banner.style.opacity = 1 - Math.abs(currentY) / 150;
            }
        }, { passive: true });

        banner.addEventListener('touchend', () => {
            if (currentY < -60) {
                this.hide();
            } else {
                banner.style.transform = `translateX(-50%)`;
                banner.style.opacity = '1';
            }
            currentY = 0;
        });
    }

    listen() {
        const uid = firebase.auth().currentUser.uid;
        this.signalRef = firebase.database().ref(`signaling/${uid}`);
        
        this.signalRef.on('value', snap => {
            const data = snap.val();
            
            if (!data) {
                this.hide();
                return;
            }

            if (Date.now() - data.timestamp > 45000) {
                this.signalRef.remove();
                this.hide();
                return;
            }

            // Fix: Smarter path check for subdirectories
            if (window.location.pathname.endsWith('calls.html')) {
                const params = new URLSearchParams(window.location.search);
                if (params.get('callId') === data.callId) return;
            }

            this.show(data);

            this.querySelector('#n-dec').onclick = (e) => {
                e.preventDefault();
                firebase.database().ref(`calls/${data.callId}`).update({ status: 'declined' });
                this.signalRef.remove();
                this.hide();
            };

            this.querySelector('#n-ans').onclick = (e) => {
                e.preventDefault();
                this.signalRef.off();
                this.hide();
                
                // Fix: Handle relative pathing for GitHub Pages subfolders
                const url = new URL('calls.html', window.location.href);
                url.searchParams.set('callId', data.callId);
                url.searchParams.set('answer', 'true');
                window.location.href = url.href;
            };

            firebase.database().ref(`calls/${data.callId}/status`).on('value', s => {
                if (['cancelled', 'ended', 'connected'].includes(s.val())) {
                    this.hide();
                }
            });
        });
    }

    show(data) {
        const banner = this.querySelector('#notif-banner');
        const userEl = this.querySelector('#n-user');
        const imgEl = this.querySelector('#n-img');
        const vEl = this.querySelector('#n-v');
        const tone = this.querySelector('#n-tone');

        userEl.childNodes[0].textContent = data.name + " ";
        vEl.className = data.verified ? 'v-chk' : '';
        imgEl.src = data.pfp || 'https://via.placeholder.com/150';
        
        banner.style.transform = `translateX(-50%)`;
        banner.style.opacity = '1';
        banner.classList.add('active');

        const playPromise = tone.play();
        if (playPromise !== undefined) {
            playPromise.catch(() => {});
        }
    }

    hide() {
        const banner = this.querySelector('#notif-banner');
        const audio = this.querySelector('#n-tone');
        if (banner) {
            banner.classList.remove('active');
            setTimeout(() => {
                banner.style.transform = `translateX(-50%)`;
                banner.style.opacity = '0';
            }, 600);
        }
        if (audio) { 
            audio.pause(); 
            audio.currentTime = 0; 
        }
    }
}
customElements.define('call-notifier', CallNotifier);