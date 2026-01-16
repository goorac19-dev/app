// components/call-notifier.js
class CallNotifier extends HTMLElement {
    async connectedCallback() {
        // Prevent interference if we are already on the call page and a call is active
        if (window.location.pathname.includes('calls.html')) {
            this.remove();
            return;
        }

        await this.loadDependencies();
        this.render();
        this.init();
        this.initSwipe();
    }

    async loadDependencies() {
        const scripts = [
            'https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js',
            'https://www.gstatic.com/firebasejs/8.10.1/firebase-auth.js',
            'https://www.gstatic.com/firebasejs/8.10.1/firebase-database.js',
            '/config.js'
        ];
        for (const src of scripts) {
            if (!document.querySelector(`script[src="${src}"]`)) {
                await new Promise(res => {
                    const s = document.createElement('script');
                    s.src = src; s.onload = res;
                    document.head.appendChild(s);
                });
            }
        }
    }

    render() {
        this.innerHTML = `
        <style>
            #notif-banner {
                position: fixed; top: -150px; left: 50%; transform: translateX(-50%);
                width: calc(100% - 30px); max-width: 400px;
                background: rgba(10, 15, 20, 0.98); backdrop-filter: blur(20px);
                border: 1px solid rgba(0, 210, 255, 0.4); border-radius: 24px;
                padding: 12px 16px; display: flex; align-items: center; justify-content: space-between;
                z-index: 999999; box-shadow: 0 15px 40px rgba(0,0,0,0.8);
                transition: top 0.5s cubic-bezier(0.16, 1, 0.3, 1), transform 0.1s linear, opacity 0.3s;
                font-family: sans-serif; touch-action: none; user-select: none;
            }
            #notif-banner.active { top: 20px; }
            .c-prof { display: flex; align-items: center; gap: 10px; color: white; pointer-events: none; }
            .c-pfp { width: 42px; height: 42px; border-radius: 50%; object-fit: cover; border: 1.5px solid #00d2ff; }
            .c-det h4 { margin: 0; font-size: 0.9rem; display: flex; align-items: center; gap: 4px; }
            .c-det p { margin: 0; font-size: 0.65rem; color: #00d2ff; font-weight: bold; text-transform: uppercase; }
            .v-chk { width: 14px; height: 14px; background: #0095f6; display: inline-block;
                -webkit-mask: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M22.5 12.5c0-1.58.8-3.04 2.12-4.03l-1.1-2.48-2.74.05a4.95 4.95 0 0 1-4.04-2.12L14.24 3l-2.47 1.1-1.1-2.48-2.5.78L7.1 5.14a4.95 4.95 0 0 1-4.04 2.12l-2.74-.05-1.1 2.48 2.12 4.03-2.12 4.03 1.1 2.48 2.74-.05a4.95 4.95 0 0 1 4.04 2.12L9.76 21l2.47-1.1 1.1 2.48 2.5-.78.78-2.73a4.95 4.95 0 0 1 4.04-2.12l2.74.05 1.1-2.48-2.12-4.03Z"/></svg>') no-repeat center;
                mask-size: contain; -webkit-mask-size: contain; }
            .n-btns { display: flex; gap: 8px; }
            .n-btn { border: none; padding: 8px 14px; border-radius: 12px; font-size: 0.75rem; font-weight: 800; cursor: pointer; }
            .n-dec { background: rgba(255, 68, 68, 0.2); color: #ff4444; }
            .n-acc { background: #1ebea5; color: #fff; }
        </style>
        <div id="notif-banner">
            <div class="c-prof">
                <img src="" class="c-pfp" id="n-img">
                <div class="c-det">
                    <h4 id="n-user">User <span id="n-v"></span></h4>
                    <p>Incoming Call...</p>
                </div>
            </div>
            <div class="n-btns">
                <button class="n-btn n-dec" id="n-dec">Decline</button>
                <button class="n-btn n-acc" id="n-ans">Answer</button>
            </div>
            <audio id="n-tone" loop><source src="https://assets.mixkit.co/active_storage/sfx/1359/1359-preview.mp3"></audio>
        </div>`;
    }

    init() {
        const check = setInterval(() => {
            if (window.firebase && firebase.auth().currentUser && firebase.database) {
                clearInterval(check);
                this.listen();
            }
        }, 1000);
    }

    initSwipe() {
        const banner = this.querySelector('#notif-banner');
        let startX = 0;
        let currentX = 0;

        banner.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
        }, { passive: true });

        banner.addEventListener('touchmove', (e) => {
            currentX = e.touches[0].clientX - startX;
            if (Math.abs(currentX) > 0) {
                banner.style.transform = `translateX(calc(-50% + ${currentX}px)) rotate(${currentX * 0.05}deg)`;
                banner.style.opacity = 1 - Math.abs(currentX) / 300;
            }
        }, { passive: true });

        banner.addEventListener('touchend', () => {
            if (Math.abs(currentX) > 120) {
                this.hide();
            } else {
                banner.style.transform = `translateX(-50%)`;
                banner.style.opacity = '1';
            }
            currentX = 0;
        });
    }

    listen() {
        const uid = firebase.auth().currentUser.uid;
        this.signalRef = firebase.database().ref(`signaling/${uid}`);
        
        this.signalRef.on('value', snap => {
            const data = snap.val();
            if (data) {
                if (Date.now() - data.timestamp > 30000) return;
                this.show(data);

                this.querySelector('#n-dec').onclick = (e) => {
                    e.stopPropagation();
                    firebase.database().ref(`calls/${data.callId}`).update({ status: 'declined' });
                    this.signalRef.remove();
                    this.hide();
                };

                this.querySelector('#n-ans').onclick = (e) => {
                    e.stopPropagation();
                    this.signalRef.off();
                    this.hide();
                    // Navigate with the auto-answer parameter
                    window.location.href = `calls.html?callId=${data.callId}&answer=true`;
                };

                firebase.database().ref(`calls/${data.callId}/status`).on('value', s => {
                    if (['cancelled', 'ended', 'connected'].includes(s.val())) this.hide();
                });
            } else {
                this.hide();
            }
        });
    }

    show(data) {
        const banner = this.querySelector('#notif-banner');
        this.querySelector('#n-user').innerHTML = `${data.name} <span class="${data.verified ? 'v-chk' : ''}"></span>`;
        this.querySelector('#n-img').src = data.pfp || 'https://via.placeholder.com/150';
        
        banner.style.transform = `translateX(-50%)`;
        banner.style.opacity = '1';
        banner.classList.add('active');
        this.querySelector('#n-tone').play().catch(() => {});
    }

    hide() {
        const banner = this.querySelector('#notif-banner');
        const audio = this.querySelector('#n-tone');
        if (banner) banner.classList.remove('active');
        if (audio) { audio.pause(); audio.currentTime = 0; }
    }
}
customElements.define('call-notifier', CallNotifier);