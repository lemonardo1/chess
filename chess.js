// 체스 게임 클래스
class ChessGame {
    constructor() {
        this.board = this.initializeBoard();
        this.currentPlayer = 'white';
        this.selectedSquare = null;
        this.moveHistory = [];
        this.gameOver = false;
        this.inCheck = { white: false, black: false };
        
        // 타이머 설정 (각 플레이어마다 10분 = 600초)
        this.timeLimit = 10 * 60; // 10분을 초로 변환
        this.timeRemaining = {
            white: this.timeLimit,
            black: this.timeLimit
        };
        this.timerStartTime = {
            white: null,
            black: null
        };
        this.timerInterval = null;
        this.timerRunning = false;
        this.lastUpdateTime = null;
        
        this.init();
    }

    initializeBoard() {
        const board = Array(8).fill(null).map(() => Array(8).fill(null));
        
        // 흰색 말 배치
        board[7][0] = { type: 'rook', color: 'white' };
        board[7][1] = { type: 'knight', color: 'white' };
        board[7][2] = { type: 'bishop', color: 'white' };
        board[7][3] = { type: 'queen', color: 'white' };
        board[7][4] = { type: 'king', color: 'white' };
        board[7][5] = { type: 'bishop', color: 'white' };
        board[7][6] = { type: 'knight', color: 'white' };
        board[7][7] = { type: 'rook', color: 'white' };
        for (let i = 0; i < 8; i++) {
            board[6][i] = { type: 'pawn', color: 'white' };
        }

        // 검은색 말 배치
        board[0][0] = { type: 'rook', color: 'black' };
        board[0][1] = { type: 'knight', color: 'black' };
        board[0][2] = { type: 'bishop', color: 'black' };
        board[0][3] = { type: 'queen', color: 'black' };
        board[0][4] = { type: 'king', color: 'black' };
        board[0][5] = { type: 'bishop', color: 'black' };
        board[0][6] = { type: 'knight', color: 'black' };
        board[0][7] = { type: 'rook', color: 'black' };
        for (let i = 0; i < 8; i++) {
            board[1][i] = { type: 'pawn', color: 'black' };
        }

        return board;
    }

    init() {
        this.renderBoard();
        this.updateGameInfo();
        this.updateTimers();
        this.loadUserStats();
        document.getElementById('reset-btn').addEventListener('click', () => this.reset());
        this.startTimer();
    }

    renderBoard() {
        const boardElement = document.getElementById('chess-board');
        boardElement.innerHTML = '';

        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const square = document.createElement('div');
                square.className = `square ${(row + col) % 2 === 0 ? 'light' : 'dark'}`;
                square.dataset.row = row;
                square.dataset.col = col;

                const piece = this.board[row][col];
                if (piece) {
                    square.textContent = this.getPieceSymbol(piece);
                }

                square.addEventListener('click', () => this.handleSquareClick(row, col));
                boardElement.appendChild(square);
            }
        }

        this.updateSquareStyles();
    }

    getPieceSymbol(piece) {
        const symbols = {
            white: {
                king: '♔',
                queen: '♕',
                rook: '♖',
                bishop: '♗',
                knight: '♘',
                pawn: '♙'
            },
            black: {
                king: '♚',
                queen: '♛',
                rook: '♜',
                bishop: '♝',
                knight: '♞',
                pawn: '♟'
            }
        };
        return symbols[piece.color][piece.type];
    }

    handleSquareClick(row, col) {
        if (this.gameOver) return;

        const piece = this.board[row][col];
        const squareKey = `${row}-${col}`;

        // 이미 선택된 칸을 다시 클릭하면 선택 해제
        if (this.selectedSquare === squareKey) {
            this.selectedSquare = null;
            this.renderBoard();
            return;
        }

        // 말 선택
        if (piece && piece.color === this.currentPlayer) {
            this.selectedSquare = squareKey;
            this.renderBoard();
            this.highlightPossibleMoves(row, col);
            return;
        }

        // 이동 시도
        if (this.selectedSquare) {
            const [selectedRow, selectedCol] = this.selectedSquare.split('-').map(Number);
            if (this.isValidMove(selectedRow, selectedCol, row, col)) {
                this.makeMove(selectedRow, selectedCol, row, col);
                this.selectedSquare = null;
                this.renderBoard();
            } else {
                // 잘못된 이동이면 선택 해제
                this.selectedSquare = null;
                this.renderBoard();
            }
        }
    }

    highlightPossibleMoves(row, col) {
        const possibleMoves = this.getPossibleMoves(row, col);
        possibleMoves.forEach(([r, c]) => {
            const square = document.querySelector(`[data-row="${r}"][data-col="${c}"]`);
            if (square) {
                if (this.board[r][c]) {
                    square.classList.add('possible-capture');
                } else {
                    square.classList.add('possible-move');
                }
            }
        });
    }

    updateSquareStyles() {
        // 선택된 칸 강조
        if (this.selectedSquare) {
            const [row, col] = this.selectedSquare.split('-').map(Number);
            const square = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
            if (square) {
                square.classList.add('selected');
            }
        }

        // 체크 상태 강조
        const kingPos = this.findKing(this.currentPlayer);
        if (kingPos && this.isInCheck(this.currentPlayer)) {
            const square = document.querySelector(`[data-row="${kingPos[0]}"][data-col="${kingPos[1]}"]`);
            if (square) {
                square.classList.add('in-check');
            }
        }
    }

    getPossibleMoves(row, col) {
        const piece = this.board[row][col];
        if (!piece) return [];

        const moves = [];
        const directions = {
            rook: [[-1, 0], [1, 0], [0, -1], [0, 1]],
            bishop: [[-1, -1], [-1, 1], [1, -1], [1, 1]],
            queen: [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [-1, 1], [1, -1], [1, 1]],
            king: [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [-1, 1], [1, -1], [1, 1]],
            knight: [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]],
            pawn: []
        };

        if (piece.type === 'pawn') {
            const direction = piece.color === 'white' ? -1 : 1;
            const startRow = piece.color === 'white' ? 6 : 1;

            // 앞으로 한 칸
            if (this.isValidPosition(row + direction, col) && !this.board[row + direction][col]) {
                moves.push([row + direction, col]);
            }

            // 시작 위치에서 두 칸
            if (row === startRow && !this.board[row + direction][col] && 
                !this.board[row + 2 * direction][col]) {
                moves.push([row + 2 * direction, col]);
            }

            // 대각선 공격
            for (const dc of [-1, 1]) {
                if (this.isValidPosition(row + direction, col + dc)) {
                    const target = this.board[row + direction][col + dc];
                    if (target && target.color !== piece.color) {
                        moves.push([row + direction, col + dc]);
                    }
                }
            }
        } else if (directions[piece.type]) {
            if (piece.type === 'knight' || piece.type === 'king') {
                // 나이트와 킹은 한 칸만 이동
                directions[piece.type].forEach(([dr, dc]) => {
                    const newRow = row + dr;
                    const newCol = col + dc;
                    if (this.isValidPosition(newRow, newCol)) {
                        const target = this.board[newRow][newCol];
                        if (!target || target.color !== piece.color) {
                            moves.push([newRow, newCol]);
                        }
                    }
                });
            } else {
                // 룩, 비숍, 퀸은 직선/대각선으로 여러 칸 이동
                directions[piece.type].forEach(([dr, dc]) => {
                    for (let i = 1; i < 8; i++) {
                        const newRow = row + dr * i;
                        const newCol = col + dc * i;
                        if (!this.isValidPosition(newRow, newCol)) break;

                        const target = this.board[newRow][newCol];
                        if (!target) {
                            moves.push([newRow, newCol]);
                        } else {
                            if (target.color !== piece.color) {
                                moves.push([newRow, newCol]);
                            }
                            break;
                        }
                    }
                });
            }
        }

        // 자기 차례에 체크 상태로 만들 수 있는 이동만 필터링
        return moves.filter(([r, c]) => {
            return this.isValidMove(row, col, r, c);
        });
    }

    isValidMove(fromRow, fromCol, toRow, toCol) {
        const piece = this.board[fromRow][fromCol];
        if (!piece || piece.color !== this.currentPlayer) return false;

        const target = this.board[toRow][toCol];
        if (target && target.color === piece.color) return false;

        // 이동 시뮬레이션
        const originalPiece = this.board[toRow][toCol];
        this.board[toRow][toCol] = piece;
        this.board[fromRow][fromCol] = null;

        // 이동 후 체크 상태인지 확인
        const inCheck = this.isInCheck(this.currentPlayer);

        // 원래 상태로 복원
        this.board[fromRow][fromCol] = piece;
        this.board[toRow][toCol] = originalPiece;

        if (inCheck) return false;

        // 실제 이동 가능 여부 확인
        const possibleMoves = this.getPossibleMovesWithoutCheck(fromRow, fromCol);
        return possibleMoves.some(([r, c]) => r === toRow && c === toCol);
    }

    getPossibleMovesWithoutCheck(row, col) {
        const piece = this.board[row][col];
        if (!piece) return [];

        const moves = [];
        const directions = {
            rook: [[-1, 0], [1, 0], [0, -1], [0, 1]],
            bishop: [[-1, -1], [-1, 1], [1, -1], [1, 1]],
            queen: [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [-1, 1], [1, -1], [1, 1]],
            king: [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [-1, 1], [1, -1], [1, 1]],
            knight: [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]],
            pawn: []
        };

        if (piece.type === 'pawn') {
            const direction = piece.color === 'white' ? -1 : 1;
            const startRow = piece.color === 'white' ? 6 : 1;

            if (this.isValidPosition(row + direction, col) && !this.board[row + direction][col]) {
                moves.push([row + direction, col]);
            }

            if (row === startRow && !this.board[row + direction][col] && 
                !this.board[row + 2 * direction][col]) {
                moves.push([row + 2 * direction, col]);
            }

            for (const dc of [-1, 1]) {
                if (this.isValidPosition(row + direction, col + dc)) {
                    const target = this.board[row + direction][col + dc];
                    if (target && target.color !== piece.color) {
                        moves.push([row + direction, col + dc]);
                    }
                }
            }
        } else if (directions[piece.type]) {
            if (piece.type === 'knight' || piece.type === 'king') {
                directions[piece.type].forEach(([dr, dc]) => {
                    const newRow = row + dr;
                    const newCol = col + dc;
                    if (this.isValidPosition(newRow, newCol)) {
                        const target = this.board[newRow][newCol];
                        if (!target || target.color !== piece.color) {
                            moves.push([newRow, newCol]);
                        }
                    }
                });
            } else {
                directions[piece.type].forEach(([dr, dc]) => {
                    for (let i = 1; i < 8; i++) {
                        const newRow = row + dr * i;
                        const newCol = col + dc * i;
                        if (!this.isValidPosition(newRow, newCol)) break;

                        const target = this.board[newRow][newCol];
                        if (!target) {
                            moves.push([newRow, newCol]);
                        } else {
                            if (target.color !== piece.color) {
                                moves.push([newRow, newCol]);
                            }
                            break;
                        }
                    }
                });
            }
        }

        return moves;
    }

    makeMove(fromRow, fromCol, toRow, toCol) {
        const piece = this.board[fromRow][fromCol];
        const captured = this.board[toRow][toCol];

        this.board[toRow][toCol] = piece;
        this.board[fromRow][fromCol] = null;

        // 폰 승급 (간단 버전: 8번째 줄 도달 시 퀸으로 승급)
        if (piece.type === 'pawn' && (toRow === 0 || toRow === 7)) {
            this.board[toRow][toCol] = { type: 'queen', color: piece.color };
        }

        // 이동 기록
        const moveNotation = this.getMoveNotation(fromRow, fromCol, toRow, toCol, captured);
        this.moveHistory.push(moveNotation);
        this.updateMoveHistory();

        // 차례 변경 전 현재 플레이어의 타이머 정지
        this.stopTimer();
        
        // 차례 변경
        this.currentPlayer = this.currentPlayer === 'white' ? 'black' : 'white';
        
        // 새 플레이어의 타이머 시작
        this.startTimer();
        
        // 타이머 업데이트
        this.updateTimerDisplay();

        // 게임 상태 확인
        this.checkGameStatus();
        this.updateGameInfo();
    }

    getMoveNotation(fromRow, fromCol, toRow, toCol, captured) {
        const cols = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
        const fromSquare = `${cols[fromCol]}${8 - fromRow}`;
        const toSquare = `${cols[toCol]}${8 - toRow}`;
        const capture = captured ? 'x' : '';
        return `${fromSquare}${capture}${toSquare}`;
    }

    updateMoveHistory() {
        const moveList = document.getElementById('move-list');
        moveList.innerHTML = '';
        this.moveHistory.forEach((move, index) => {
            const moveItem = document.createElement('div');
            moveItem.className = 'move-item';
            moveItem.textContent = `${index + 1}. ${move}`;
            moveList.appendChild(moveItem);
        });
        moveList.scrollTop = moveList.scrollHeight;
    }

    isValidPosition(row, col) {
        return row >= 0 && row < 8 && col >= 0 && col < 8;
    }

    findKing(color) {
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece && piece.type === 'king' && piece.color === color) {
                    return [row, col];
                }
            }
        }
        return null;
    }

    isInCheck(color) {
        const kingPos = this.findKing(color);
        if (!kingPos) return false;

        const opponentColor = color === 'white' ? 'black' : 'white';

        // 상대방의 모든 말이 킹을 공격할 수 있는지 확인
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece && piece.color === opponentColor) {
                    const moves = this.getPossibleMovesWithoutCheck(row, col);
                    if (moves.some(([r, c]) => r === kingPos[0] && c === kingPos[1])) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    hasValidMoves(color) {
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece && piece.color === color) {
                    const moves = this.getPossibleMoves(row, col);
                    if (moves.length > 0) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    checkGameStatus() {
        // 시간 초과 확인
        if (this.timeRemaining.white <= 0) {
            this.gameOver = true;
            this.stopTimer();
            document.getElementById('game-status').textContent = '시간 초과! 검은색 승리!';
            this.handleGameEnd('black');
            return;
        }
        if (this.timeRemaining.black <= 0) {
            this.gameOver = true;
            this.stopTimer();
            document.getElementById('game-status').textContent = '시간 초과! 흰색 승리!';
            this.handleGameEnd('white');
            return;
        }

        const inCheck = this.isInCheck(this.currentPlayer);
        const hasMoves = this.hasValidMoves(this.currentPlayer);

        if (inCheck && !hasMoves) {
            this.gameOver = true;
            this.stopTimer();
            const winner = this.currentPlayer === 'white' ? '검은색' : '흰색';
            document.getElementById('game-status').textContent = `체크메이트! ${winner} 승리!`;
            this.handleGameEnd(this.currentPlayer === 'white' ? 'black' : 'white');
        } else if (!inCheck && !hasMoves) {
            this.gameOver = true;
            this.stopTimer();
            document.getElementById('game-status').textContent = '스테일메이트! 무승부';
            this.handleGameEnd(null);
        } else if (inCheck) {
            document.getElementById('game-status').textContent = '체크!';
        } else {
            document.getElementById('game-status').textContent = '';
        }
    }

    updateGameInfo() {
        const turnText = this.currentPlayer === 'white' ? '흰색 차례' : '검은색 차례';
        document.getElementById('current-turn').textContent = turnText;
    }

    reset() {
        this.stopTimer();
        this.board = this.initializeBoard();
        this.currentPlayer = 'white';
        this.selectedSquare = null;
        this.moveHistory = [];
        this.gameOver = false;
        this.inCheck = { white: false, black: false };
        this.timeRemaining = {
            white: this.timeLimit,
            black: this.timeLimit
        };
        this.timerStartTime = {
            white: null,
            black: null
        };
        this.lastUpdateTime = null;
        document.getElementById('game-status').textContent = '';
        this.renderBoard();
        this.updateGameInfo();
        this.updateTimers();
        document.getElementById('move-list').innerHTML = '';
        this.startTimer();
    }

    // 타이머 관련 메서드
    startTimer() {
        if (this.timerRunning || this.gameOver) return;
        
        // 현재 플레이어의 타이머 시작 시간 기록
        const now = Date.now();
        if (!this.timerStartTime[this.currentPlayer]) {
            this.timerStartTime[this.currentPlayer] = now;
        }
        
        this.timerRunning = true;
        this.lastUpdateTime = now;
        
        // 더 정확한 타이머를 위해 100ms마다 업데이트
        this.timerInterval = setInterval(() => {
            if (this.gameOver) {
                this.stopTimer();
                return;
            }
            
            const currentTime = Date.now();
            const elapsed = (currentTime - this.lastUpdateTime) / 1000; // 초 단위
            
            if (elapsed >= 1.0) {
                // 1초 이상 경과했으면 시간 감소
                const secondsToDeduct = Math.floor(elapsed);
                this.timeRemaining[this.currentPlayer] = Math.max(0, this.timeRemaining[this.currentPlayer] - secondsToDeduct);
                this.lastUpdateTime = currentTime - ((elapsed - secondsToDeduct) * 1000); // 나머지 시간 보정
                
                this.updateTimerDisplay();
                this.checkGameStatus();
            }
        }, 100); // 100ms마다 체크하여 더 정확하게
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        this.timerRunning = false;
    }

    updateTimerDisplay() {
        const whiteTime = this.formatTime(this.timeRemaining.white);
        const blackTime = this.formatTime(this.timeRemaining.black);
        
        document.getElementById('white-timer').textContent = whiteTime;
        document.getElementById('black-timer').textContent = blackTime;

        // 활성 플레이어 강조
        const whiteTimerBox = document.querySelector('.white-timer');
        const blackTimerBox = document.querySelector('.black-timer');
        
        whiteTimerBox.classList.remove('active', 'time-warning', 'time-critical');
        blackTimerBox.classList.remove('active', 'time-warning', 'time-critical');

        if (!this.gameOver) {
            if (this.currentPlayer === 'white') {
                whiteTimerBox.classList.add('active');
                if (this.timeRemaining.white <= 60) {
                    whiteTimerBox.classList.add('time-critical');
                } else if (this.timeRemaining.white <= 180) {
                    whiteTimerBox.classList.add('time-warning');
                }
            } else {
                blackTimerBox.classList.add('active');
                if (this.timeRemaining.black <= 60) {
                    blackTimerBox.classList.add('time-critical');
                } else if (this.timeRemaining.black <= 180) {
                    blackTimerBox.classList.add('time-warning');
                }
            }
        }
    }

    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    updateTimers() {
        this.updateTimerDisplay();
    }

    // 게임 종료 처리 및 트로피 시스템
    handleGameEnd(winner) {
        if (!winner) {
            // 무승부는 트로피 없음
            return;
        }

        // 현재 로그인한 사용자 확인
        const currentUser = typeof auth !== 'undefined' ? auth.getCurrentUser() : null;
        if (!currentUser) return;

        const username = currentUser.username;
        
        // 사용자 통계 가져오기
        const userStats = JSON.parse(localStorage.getItem('chessUserStats') || '{}');
        
        if (!userStats[username]) {
            userStats[username] = {
                trophies: 0,
                wins: 0,
                losses: 0,
                draws: 0
            };
        }

        // 승리 처리
        // 단일 플레이어 모드에서는 사용자가 흰색을 플레이한다고 가정
        // 흰색이 이기면 사용자가 승리한 것으로 처리
        if (winner === 'white') {
            userStats[username].wins++;
            userStats[username].trophies += 15; // 승리 시 트로피 15개 추가
            
            // 트로피 획득 알림
            this.showTrophyNotification(10);
        } else {
            // 검은색이 이기면 패배
            userStats[username].losses++;
        }

        // 통계 저장
        localStorage.setItem('chessUserStats', JSON.stringify(userStats));
        
        // UI 업데이트
        this.loadUserStats();
    }

    showTrophyNotification(trophies) {
        // 트로피 획득 알림 표시
        const notification = document.createElement('div');
        notification.className = 'trophy-notification';
        notification.innerHTML = `🏆 +${trophies} 트로피 획득!`;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }

    loadUserStats() {
        const currentUser = typeof auth !== 'undefined' ? auth.getCurrentUser() : null;
        if (!currentUser) return;

        const username = currentUser.username;
        const userStats = JSON.parse(localStorage.getItem('chessUserStats') || '{}');
        
        if (userStats[username]) {
            document.getElementById('user-trophies').textContent = userStats[username].trophies || 0;
            document.getElementById('user-wins').textContent = userStats[username].wins || 0;
        } else {
            document.getElementById('user-trophies').textContent = '0';
            document.getElementById('user-wins').textContent = '0';
        }
    }
}

// 게임 시작 (인증 후에만 초기화)
let game = null;

// 인증 시스템이 준비되면 게임 초기화
if (typeof auth !== 'undefined' && auth.getCurrentUser()) {
    game = new ChessGame();
}

