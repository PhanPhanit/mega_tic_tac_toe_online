const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const crypto = require("crypto");

const app = express();
const server = http.createServer(app);
const io = new Server(server);
app.use(express.static("public"));

const rooms = new Map();
const makeCode = () => crypto.randomBytes(3).toString("hex").toUpperCase();

function publicRoom(room) {
  return {
    code: room.code, size: room.size, target: room.target,
    board: room.board, turn: room.turn, winner: room.winner,
    winningCells: room.winningCells, players: room.players.map(p => p ? {name:p.name, mark:p.mark, connected:true} : null),
    status: room.players.length < 2 || !room.players[1] ? "waiting" : "playing"
  };
}
function emitRoom(room) { io.to(room.code).emit("state", publicRoom(room)); }
function checkWin(board, size, target, index, mark) {
  const row=Math.floor(index/size), col=index%size, dirs=[[1,0],[0,1],[1,1],[1,-1]];
  for (const [dr,dc] of dirs) {
    const cells=[index];
    for (const sign of [-1,1]) {
      let r=row+dr*sign,c=col+dc*sign;
      while(r>=0&&r<size&&c>=0&&c<size&&board[r*size+c]===mark) {
        cells.push(r*size+c); r+=dr*sign; c+=dc*sign;
      }
    }
    if(cells.length>=target) return cells;
  }
  return null;
}
io.on("connection", socket => {
  socket.on("createRoom", ({name,size,target}={}) => {
    size=Math.max(5,Math.min(30,Number(size)||15));
    target=Math.max(3,Math.min(size,Number(target)||5));
    let code; do {code=makeCode()} while(rooms.has(code));
    const room={code,size,target,board:Array(size*size).fill(""),turn:"X",winner:null,winningCells:[],players:[{id:socket.id,name:String(name||"Player 1").slice(0,24),mark:"X"}]};
    rooms.set(code,room); socket.join(code); socket.data.room=code; socket.data.mark="X";
    socket.emit("joined",{code,mark:"X"}); emitRoom(room);
  });
  socket.on("joinRoom", ({code,name}={}) => {
    code=String(code||"").trim().toUpperCase(); const room=rooms.get(code);
    if(!room){socket.emit("errorMessage","Room not found. Check the code.");return;}
    if(room.players.length>=2){socket.emit("errorMessage","This room already has two players.");return;}
    room.players.push({id:socket.id,name:String(name||"Player 2").slice(0,24),mark:"O"});
    socket.join(code);socket.data.room=code;socket.data.mark="O";
    socket.emit("joined",{code,mark:"O"});emitRoom(room);
  });
  socket.on("move", index => {
    const room=rooms.get(socket.data.room); if(!room||room.winner||room.players.length<2)return;
    const player=room.players.find(p=>p&&p.id===socket.id);
    if(!player||player.mark!==room.turn||!Number.isInteger(index)||index<0||index>=room.board.length||room.board[index])return;
    room.board[index]=player.mark;
    const cells=checkWin(room.board,room.size,room.target,index,player.mark);
    if(cells){room.winner=player.mark;room.winningCells=cells;}
    else if(room.board.every(Boolean)){room.winner="draw";}
    else room.turn=room.turn==="X"?"O":"X";
    emitRoom(room);
  });
  socket.on("restart",()=>{
    const room=rooms.get(socket.data.room);if(!room||!room.players.some(p=>p&&p.id===socket.id))return;
    room.board=Array(room.size*room.size).fill("");room.turn="X";room.winner=null;room.winningCells=[];emitRoom(room);
  });
  socket.on("disconnect",()=>{
    const code=socket.data.room,room=rooms.get(code);if(!room)return;
    // Keep room for a short reconnect window; notify the other player.
    io.to(code).emit("opponentDisconnected");
    setTimeout(()=>{const r=rooms.get(code);if(r&&r.players.every(p=>!p||!io.sockets.sockets.has(p.id)))rooms.delete(code);},120000);
  });
});
const PORT=process.env.PORT||3000;
server.listen(PORT,()=>console.log(`Mega Tic Tac Toe running on port ${PORT}`));
