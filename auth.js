// 인증 시스템 클래스
class AuthSystem {
    constructor() {
        this.isLoginMode = true;
        this.currentUser = null;
        this.init();
    }

    init() {
        // 로컬 스토리지에서 사용자 데이터 초기화 (없으면 빈 객체)
        if (!localStorage.getItem('chessUsers')) {
            localStorage.setItem('chessUsers', JSON.stringify({}));
        }

        // 저장된 세션 확인
        const session = localStorage.getItem('chessSession');
        if (session) {
            try {
                const userData = JSON.parse(session);
                if (this.validateSession(userData)) {
                    this.currentUser = userData;
                    this.showGame();
                    return;
                }
            } catch (e) {
                localStorage.removeItem('chessSession');
            }
        }

        // 로그인 모달 표시
        this.showLoginModal();
        this.setupEventListeners();
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
        authForm.addEventListener('submit', (e) => {
            e.preventDefault();
            if (this.isLoginMode) {
                this.login();
            } else {
                this.register();
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
            switchText.innerHTML = '계정이 없으신가요? <a href="#" id="switch-link">회원가입</a>';
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

    hashPassword(password) {
        // 간단한 해시 함수 (실제 프로덕션에서는 더 강력한 해싱 사용 권장)
        let hash = 0;
        for (let i = 0; i < password.length; i++) {
            const char = password.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // 32비트 정수로 변환
        }
        return hash.toString();
    }

    register() {
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirm-password').value;

        // 유효성 검사
        if (!username || username.length < 3) {
            this.showError('사용자명은 최소 3자 이상이어야 합니다.');
            return;
        }

        if (!password || password.length < 4) {
            this.showError('비밀번호는 최소 4자 이상이어야 합니다.');
            return;
        }

        if (password !== confirmPassword) {
            this.showError('비밀번호가 일치하지 않습니다.');
            return;
        }

        // 사용자 데이터 가져오기
        const users = JSON.parse(localStorage.getItem('chessUsers'));

        // 중복 확인
        if (users[username]) {
            this.showError('이미 존재하는 사용자명입니다.');
            return;
        }

        // 새 사용자 등록
        users[username] = {
            username: username,
            passwordHash: this.hashPassword(password),
            createdAt: new Date().toISOString()
        };

        localStorage.setItem('chessUsers', JSON.stringify(users));

        // 자동 로그인
        this.currentUser = {
            username: username,
            loginTime: new Date().toISOString()
        };
        localStorage.setItem('chessSession', JSON.stringify(this.currentUser));

        this.showSuccess('회원가입이 완료되었습니다!');
        setTimeout(() => {
            this.showGame();
        }, 500);
    }

    login() {
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;

        if (!username || !password) {
            this.showError('사용자명과 비밀번호를 입력해주세요.');
            return;
        }

        // 사용자 데이터 가져오기
        const users = JSON.parse(localStorage.getItem('chessUsers'));

        // 사용자 확인
        const user = users[username];
        if (!user) {
            this.showError('사용자명 또는 비밀번호가 올바르지 않습니다.');
            return;
        }

        // 비밀번호 확인
        const passwordHash = this.hashPassword(password);
        if (user.passwordHash !== passwordHash) {
            this.showError('사용자명 또는 비밀번호가 올바르지 않습니다.');
            return;
        }

        // 로그인 성공
        this.currentUser = {
            username: username,
            loginTime: new Date().toISOString()
        };
        localStorage.setItem('chessSession', JSON.stringify(this.currentUser));

        this.showSuccess('로그인 성공!');
        setTimeout(() => {
            this.showGame();
        }, 500);
    }

    logout() {
        if (confirm('정말 로그아웃하시겠습니까?')) {
            this.currentUser = null;
            localStorage.removeItem('chessSession');
            this.showLoginModal();
            
            // 폼 초기화
            document.getElementById('auth-form').reset();
            document.getElementById('error-message').classList.remove('show');
        }
    }

    validateSession(userData) {
        if (!userData || !userData.username) return false;

        const users = JSON.parse(localStorage.getItem('chessUsers'));
        return !!users[userData.username];
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
            document.getElementById('user-name').textContent = `안녕하세요, ${this.currentUser.username}님!`;
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

// 인증 시스템 초기화
const auth = new AuthSystem();

