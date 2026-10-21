let wt = new WarpTalk("wss", "warp.cs.au.dk/talk/");
const btnLoginOut = document.querySelector(".login-out-btn");
const btnSend1 = document.getElementById("slot1-submit");
const btnSend2 = document.getElementById("slot2-submit");

console.log("Connecting to the WarpTalk server ...");


// We will first check to see if we already are logged in with a registered nickname
// This will ask the server, so we have to wait for a response. We do this with a callback function.
wt.isLoggedIn(function (isLoggedIn) {
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

    // These two lines puts the functions on the global window object so
    // so they can be called from the JavaScript console
    window.send = function (msg) {
        activeSlots[1].send(msg);
    };
    window.login = function (username, password) {
        wt.login(username, password);
    }
    window.logout = function () {
        wt.logout();
    }
};


btnLoginOut.addEventListener("click", () => {
    if (btnLoginOut.textContent === "Logout") {
        wt.logout();
    } else {
        const username = prompt("Enter your registered nickname:");
        if (username) {
            const password = prompt("Enter your password:");
            if (password) {
                wt.login(username, password);
            }
        }
    }
});


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

        if (activeSlots[1] && activeSlots[1].name === room.name) {
            const ind = document.createElement("span");
            ind.className = "slot-indicator";
            ind.textContent = "1";
            li.appendChild(ind);
        } else if (activeSlots[2] && activeSlots[2].name === room.name) {
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

            const roomName = e.dataTransfer.getData("text/plain");
            if (roomName) {
                assignRoomToSlot(roomName, slot.id, el);
            }
        });
    });
}

function assignRoomToSlot(roomName, slotId, slotElement) {

    const joinedRoom = wt.join(roomName);

    activeSlots[slotId] = joinedRoom;

    console.log(`Assigned ${joinedRoom.name} to Slot ${slotId}`);

    const header = slotElement.querySelector(".slot-header");
    header.textContent = `Room: ${joinedRoom.name}`;

    const messagesArea = slotElement.querySelector(".slot-messages");
    messagesArea.innerHTML = `<p style="margin: 5px 10px; color: gray;"><em>Joined ${joinedRoom.name}</em></p>`;

    updateRoomList();
    setupParticipantList(joinedRoom, slotElement);


    // Subscrbe to messagees
    // We can subscribe to messages.
    // Note that the callback function has two parameters: the room and the message.
    activeSlots[slotId].onMessage((room, msg) => {
        console.log(`${room.name} - ${msg.sender}: ${msg.message}`);
        appendMessageToUI(msg.sender, msg.message, slotElement);
    });

    // We can also subscribe to notifications of clients joining the room
    activeSlots[slotId].onJoin((room, nickname) => {
        console.log(`${nickname} joined ${room.name}`);
        displayJoinLeaveInSlot(slotId, `${nickname} joined ${room.name}`);
        clearChatMessageArea(slotId);
        setupParticipantList(joinedRoom, slotElement);

    });

    // ... and leaving the room
    activeSlots[slotId].onLeave((room, nickname) => {
        console.log(`${nickname} left ${room.name}`);
        displayJoinLeaveInSlot(slotId, `${nickname} left ${room.name}`);
    });

    // Also to get a notification if the connection to the server is lost
    // The client will automatically try to reconnect
    activeSlots[slotId].onDisconnect((room) => {
        console.log(`Connection to server lost`);
    });



}

function clearChatMessageArea(slotId) {
    const slotElement = document.getElementById(`slot-${slotId}`);
    const messagesArea = slotElement.querySelector(".slot-messages");
    messagesArea.innerHTML = "";
}

// ----- Participation list functions ---

function addParticipantToUI(nickname, isRegistered, listElement) {
    const li = document.createElement("li");
    li.textContent = nickname;
    li.dataset.nickname = nickname;
    if (isRegistered) {
        li.style.fontWeight = "bold";
        li.style.color = "green";
    } else {
        li.style.fontWeight = "normal";
        li.style.color = "black";
    }
    listElement.appendChild(li);
}

function removeParticipantFromUi(nickname, listElement) {
    const itemToRemove = listElement.querySelector(`li[data-nickname="${nickname}"]`);
    if (itemToRemove) {
        itemToRemove.remove();
    }
}

function setupParticipantList(room, slotElement) {
    const participantList = slotElement.querySelector(".participant-list");
    participantList.innerHTML = "";
    if (room.clients) {
        room.clients.forEach(client => {
            addParticipantToUI(client.nickname, client.registered, participantList);
        });
    }

    room.onJoin((r, nickname) => {
        const newlyJoinedClient = r.clients.find(c => c.nickname === nickname);
        const isRegistered = newlyJoinedClient ? newlyJoinedClient.registered : false
        addParticipantToUI(nickname, isRegistered, participantList);
    });

    room.onLeave((r, nickname) => {
        removeParticipantFromUi(nickname, participantList);
    });
}


// ----- Message manipulation functions -----


btnSend1.addEventListener("click", () => {
    const input = document.querySelector(".slot1-input");
    const message = input.value.trim();
    if (message && activeSlots[1]) {
        activeSlots[1].send(message);
        input.value = "";
    }
});

btnSend2.addEventListener("click", () => {
    const input = document.querySelector(".slot2-input");
    const message = input.value.trim();
    if (message && activeSlots[2]) {
        activeSlots[2].send(message);
        input.value = "";
    }
});

function displayJoinLeaveInSlot(slotId, message) {
    const slotElement = document.getElementById(`slot-${slotId}`);
    const messagesArea = slotElement.querySelector(".slot-messages");
    messagesArea.innerHTML += `<p><em>${message}</em></p>`;
}

function appendMessageToUI(sender, messageText, slotElement) {
    const messagesArea = slotElement.querySelector(".slot-messages");

    const messageWrapper = document.createElement("p");
    messageWrapper.style.margin = "5px 10px";
    messageWrapper.style.wordBreak = "break-word";

    const formattedText = formatMessage(messageText);

    messageWrapper.innerHTML = `<strong>${sender}:</strong> ${formattedText}`;

    messagesArea.appendChild(messageWrapper);

    messagesArea.scrollTop = messagesArea.scrollHeight;
}

function formatMessage(message) {
    if (!message) return "";
    let safeText = message;
    safeText = safeText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    safeText = safeText.replace(/__(.*?)__/g, '<u>$1</u>');
    safeText = safeText.replace(/\*(.*?)\*/g, '<em>$1</em>');
    return safeText;
}

setupDragAndDrop();
