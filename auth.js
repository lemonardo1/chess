// 인증 시스템 클래스 (Firebase Authentication 사용)
class AuthSystem {
    constructor() {
        this.isLoginMode = true;
        this.currentUser = null;
        this.init();
    }

    async init() {
        // Firebase가 로드될 때까지 대기
        await this.waitForFirebase();

        // Firebase 인증 상태 리스너 설정
        if (window.auth) {
            window.auth.onAuthStateChanged((user) => {
                if (user) {
                    // 사용자가 로그인되어 있음
                    this.currentUser = {
                        uid: user.uid,
                        email: user.email,
                        displayName: user.displayName || user.email.split('@')[0]
                    };
                    this.showGame();
                } else {
                    // 사용자가 로그아웃되어 있음
                    this.currentUser = null;
                    this.showLoginModal();
                }
            });
        } else {
            // Firebase가 아직 로드되지 않았으면 모달 표시
            this.showLoginModal();
        }

        this.setupEventListeners();
    }

    waitForFirebase() {
        return new Promise((resolve) => {
            const checkFirebase = setInterval(() => {
                if (window.auth && window.db) {
                    clearInterval(checkFirebase);
                    resolve();
                }
            }, 100);
            
            // 최대 5초 대기
            setTimeout(() => {
                clearInterval(checkFirebase);
                resolve();
            }, 5000);
        });
    }

    setupEventListeners() {
        const modal = document.getElementById('login-modal');
        const closeBtn = document.querySelector('.close');
        const switchLink = document.getElementById('switch-link');
        const authForm = document.getElementById('auth-form');
        const logoutBtn = document.getElementById('logout-btn');

        // 모달 닫기
        closeBtn.addEventListener('click', () => {
            // 로그인하지 않으면 모달을 닫을 수 없음
            if (!this.currentUser) {
                this.showError('게임을 시작하려면 로그인이 필요합니다.');
            }
        });

        // 모달 외부 클릭 시 닫기 방지
        window.addEventListener('click', (e) => {
            if (e.target === modal && !this.currentUser) {
                this.showError('게임을 시작하려면 로그인이 필요합니다.');
            }
        });

        // 로그인/회원가입 전환
        switchLink.addEventListener('click', (e) => {
            e.preventDefault();
            this.toggleAuthMode();
        });

        // 폼 제출
        authForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (this.isLoginMode) {
                await this.login();
            } else {
                await this.register();
            }
        });

        // 로그아웃
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.logout();
            });
        }
    }

    toggleAuthMode() {
        this.isLoginMode = !this.isLoginMode;
        const modalTitle = document.getElementById('modal-title');
        const submitBtn = document.getElementById('submit-btn');
        const switchText = document.getElementById('switch-text');
        const switchLink = document.getElementById('switch-link');
        const confirmPasswordGroup = document.getElementById('confirm-password-group');
        const errorMessage = document.getElementById('error-message');

        // 에러 메시지 초기화
        errorMessage.classList.remove('show');
        errorMessage.textContent = '';

        if (this.isLoginMode) {
            modalTitle.textContent = '로그인';
            submitBtn.textContent = '로그인';
            switchText.innerHTML = '계정이 없어요? <a href="#" id="switch-link">회원가입</a>';
            confirmPasswordGroup.style.display = 'none';
            document.getElementById('confirm-password').required = false;
        } else {
            modalTitle.textContent = '회원가입';
            submitBtn.textContent = '회원가입';
            switchText.innerHTML = '이미 계정이 있으신가요? <a href="#" id="switch-link">로그인</a>';
            confirmPasswordGroup.style.display = 'block';
            document.getElementById('confirm-password').required = true;
        }

        // 이벤트 리스너 재설정
        document.getElementById('switch-link').addEventListener('click', (e) => {
            e.preventDefault();
            this.toggleAuthMode();
        });
    }

    async register() {
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirm-password').value;

        // 유효성 검사
        if (!email || !this.isValidEmail(email)) {
            this.showError('올바른 이메일 주소를 입력해주세요.');
            return;
        }

        if (!password || password.length < 6) {
            this.showError('비밀번호는 최소 6자 이상이어야 합니다.');
            return;
        }

        if (password !== confirmPassword) {
            this.showError('비밀번호가 일치하지 않습니다.');
            return;
        }

        try {
            // Firebase SDK 동적 로드
            const { createUserWithEmailAndPassword } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js");
            
            // Firebase 회원가입
            const userCredential = await createUserWithEmailAndPassword(window.auth, email, password);
            const user = userCredential.user;

            // 사용자 통계 초기화 (Firestore에 저장)
            await this.initializeUserStats(user.uid);

            this.showSuccess('회원가입이 완료되었습니다!');
            
            // onAuthStateChanged가 자동으로 호출되어 게임 화면 표시
        } catch (error) {
            let errorMessage = '회원가입 중 오류가 발생했습니다.';
            
            switch (error.code) {
                case 'auth/email-already-in-use':
                    errorMessage = '이미 사용 중인 이메일입니다.';
                    break;
                case 'auth/invalid-email':
                    errorMessage = '올바른 이메일 주소를 입력해주세요.';
                    break;
                case 'auth/weak-password':
                    errorMessage = '비밀번호가 너무 약합니다.';
                    break;
                default:
                    errorMessage = error.message || errorMessage;
            }
            
            this.showError(errorMessage);
        }
    }

    async login() {
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        if (!email || !password) {
            this.showError('이메일과 비밀번호를 입력해주세요.');
            return;
        }

        try {
            // Firebase SDK 동적 로드
            const { signInWithEmailAndPassword } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js");
            
            // Firebase 로그인
            await signInWithEmailAndPassword(window.auth, email, password);

            this.showSuccess('로그인 성공!');
            
            // onAuthStateChanged가 자동으로 호출되어 게임 화면 표시
        } catch (error) {
            let errorMessage = '로그인 중 오류가 발생했습니다.';
            
            switch (error.code) {
                case 'auth/user-not-found':
                case 'auth/wrong-password':
                case 'auth/invalid-credential':
                    errorMessage = '이메일 또는 비밀번호가 올바르지 않습니다.';
                    break;
                case 'auth/invalid-email':
                    errorMessage = '올바른 이메일 주소를 입력해주세요.';
                    break;
                case 'auth/user-disabled':
                    errorMessage = '비활성화된 계정입니다.';
                    break;
                default:
                    errorMessage = error.message || errorMessage;
            }
            
            this.showError(errorMessage);
        }
    }

    async logout() {
        if (confirm('정말 로그아웃하시겠습니까?')) {
            try {
                const { signOut } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js");
                await signOut(window.auth);
                
                this.currentUser = null;
                this.showLoginModal();
                
                // 폼 초기화
                document.getElementById('auth-form').reset();
                document.getElementById('error-message').classList.remove('show');
            } catch (error) {
                this.showError('로그아웃 중 오류가 발생했습니다.');
            }
        }
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    async initializeUserStats(uid) {
        try {
            const { doc, setDoc } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
            const userStatsRef = doc(window.db, 'users', uid);
            
            await setDoc(userStatsRef, {
                trophies: 0,
                wins: 0,
                losses: 0,
                draws: 0,
                createdAt: new Date().toISOString()
            }, { merge: true });
        } catch (error) {
            console.error('사용자 통계 초기화 오류:', error);
        }
    }

    showError(message) {
        const errorMessage = document.getElementById('error-message');
        errorMessage.textContent = message;
        errorMessage.style.backgroundColor = '#fee';
        errorMessage.style.color = '#c33';
        errorMessage.style.borderColor = '#fcc';
        errorMessage.classList.add('show');
    }

    showSuccess(message) {
        const errorMessage = document.getElementById('error-message');
        errorMessage.textContent = message;
        errorMessage.style.backgroundColor = '#efe';
        errorMessage.style.color = '#3c3';
        errorMessage.style.borderColor = '#cfc';
        errorMessage.classList.add('show');
    }

    showLoginModal() {
        document.getElementById('login-modal').style.display = 'flex';
        document.getElementById('game-container').style.display = 'none';
    }

    showGame() {
        document.getElementById('login-modal').style.display = 'none';
        document.getElementById('game-container').style.display = 'block';
        
        // 사용자명 표시
        if (this.currentUser) {
            const displayName = this.currentUser.displayName || this.currentUser.email?.split('@')[0] || '사용자';
            document.getElementById('user-name').textContent = `안녕하세요, ${displayName}님!`;
        }

        // 게임 초기화 (이미 초기화되어 있으면 재초기화하지 않음)
        if (typeof window.game === 'undefined' || !window.game) {
            window.game = new ChessGame();
        } else {
            // 게임이 이미 있으면 통계만 업데이트
            window.game.loadUserStats();
        }
    }

    getCurrentUser() {
        return this.currentUser;
    }
}

// 인증 시스템 초기화 (Firebase 로드 후)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.authSystem = new AuthSystem();
    });
} else {
    window.authSystem = new AuthSystem();
}
