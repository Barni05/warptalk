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
const activeSlots = {
    1: null,
    2: null
};

// ------ Loading functions for the ui ---
function updateRoomList() {
    const roomList = document.querySelector(".room-list");
    roomList.innerHTML = "";

    wt.availableRooms.forEach(room => {
        const li = document.createElement("li");
        
        const nameSpan = document.createElement("span");
        nameSpan.textContent = room.name;
        li.appendChild(nameSpan);

        if (activeSlots[1] === room.name) {
            const ind = document.createElement("span");
            ind.className = "slot-indicator";
            ind.textContent = "1";
            li.appendChild(ind);
        } else if (activeSlots[2] === room.name) {
            const ind = document.createElement("span");
            ind.className = "slot-indicator";
            ind.textContent = "2";
            li.appendChild(ind);
        }

        li.setAttribute("draggable", "true");

        li.addEventListener("dragstart", (e) => {
            e.dataTransfer.setData("text/plain", room.name);
            e.dataTransfer.effectAllowed = "move";
        });

        roomList.appendChild(li);
    });
}

// ------ Drag and Drop Setup ----
function setupDragAndDrop() {
    const slots = [
        { id: 1, element: document.getElementById("slot-1") },
        { id: 2, element: document.getElementById("slot-2") }
    ];

    slots.forEach(slot => {
        const el = slot.element;

        el.addEventListener("dragover", (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
            el.classList.add("drag-over");
        });

        el.addEventListener("dragleave", () => {
            el.classList.remove("drag-over");
        });

        el.addEventListener("drop", (e) => {
            e.preventDefault();
            el.classList.remove("drag-over");

            // 3. Get the room name we dragged
            const roomName = e.dataTransfer.getData("text/plain");
            if (roomName) {
                assignRoomToSlot(roomName, slot.id, el);
            }
        });
    });
}

function assignRoomToSlot(roomName, slotId, slotElement) {
    
    activeSlots[slotId] = roomName;
    
    const joinedRoom = wt.join(roomName);
    console.log(`Assigned ${joinedRoom.name} to Slot ${slotId}`);

    const header = slotElement.querySelector(".slot-header");
    header.textContent = `Room: ${joinedRoom.name}`;
    
    const messagesArea = slotElement.querySelector(".slot-messages");
    messagesArea.innerHTML = `<p><em>Joined ${joinedRoom.name}</em></p>`;

    updateRoomList();
}

setupDragAndDrop();
wt.onAvailableRoomsChanged(updateRoomList);