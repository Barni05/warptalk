let wt = new WarpTalk("wss", "warp.cs.au.dk/talk/");
const btnLoginOut = document.querySelector(".login-out-btn");

console.log("Connecting to the WarpTalk server ...");

// We will first check to see if we already are logged in with a registered nickname
// This will ask the server, so we have to wait for a response. We do this with a callback function.
wt.isLoggedIn(function(isLoggedIn) {
    if (isLoggedIn) { // If we are already logged in we can call connect that we also give a function to call when the connection has been established
        wt.connect(connected);
        btnLoginOut.textContent = "Logout";
    } else { // If not, we prompt the user for a temporary unregistered nickname
       let nickname = prompt("What's your nickname?");
       btnLoginOut.textContent = "Login";
       wt.connect(connected, nickname);
    }
});
// This function is called when the connection to the server is established (we give it as argument to connect above).
function connected() {
    console.log("Connection established.");
    // We can now list the rooms available on the server
    console.log("The server has the following rooms:");
    wt.availableRooms.forEach(r => {
        console.log(`- ${r.name}: ${r.description}`);
    });

    updateRoomList();

    // Let's join a room. We'll take the first one in the list. That's 'General'.
    let room = wt.join(wt.availableRooms[0].name);

    // We can now use the room object to send a message to that room.
    room.send("Hello, room!");

    // We can subscribe to messages.
    // Note that the callback function has two parameters: the room and the message.
    room.onMessage((room, msg) => {
        console.log(`${room.name} - ${msg.sender}: ${msg.message}`);
    });

    // We can also subscribe to notifications of clients joining the room
    room.onJoin((room, nickname) => {
       console.log(`${nickname} joined ${room.name}`);
    });

    // ... and leaving the room
    room.onLeave((room, nickname) => {
        console.log(`${nickname} left ${room.name}`);
    });

    // Also to get a notification if the connection to the server is lost
    // The client will automatically try to reconnect
    room.onDisconnect((room) => {
       console.log(`Connection to server lost`);
    });

    // These two lines puts the functions on the global window object so
    // so they can be called from the JavaScript console
    window.send = function(msg) {
        room.send(msg);
    };
    window.login = function(username, password) {
        wt.login(username, password);
    }
    window.logout = function() {
        wt.logout();
    }
};

// ------ Loading functions for the ui ---
function updateRoomList() {
    const roomList = document.querySelector(".room-list");
    roomList.innerHTML = "";

    wt.availableRooms.forEach(room => {
        const li = document.createElement("li");
        li.textContent = room.name;
        roomList.appendChild(li);
        li.addEventListener("click", () => {
            const joinedRoom = wt.join(room.name);
            console.log(`Joined room: ${joinedRoom.name}`);
        });
    });
}

// Update the room list when the available rooms change
wt.onAvailableRoomsChanged(updateRoomList);