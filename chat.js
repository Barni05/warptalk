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
        const usernameDisplay = document.getElementById("username");
        usernameDisplay.textContent = `Logged in as: ${nickname} (unregistered)`;
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
    window.login = async function (username, password) {
        await wt.login(username, password);
        const usernameDisplay = document.getElementById("username");
        usernameDisplay.textContent = `Logged in as: ${username}`;
        btnLoginOut.textContent = "Logout";
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

const initializedRooms = new Set();

function assignRoomToSlot(roomName, slotId, slotElement) {
    clearChatMessageArea(slotId);

    // Leave the previous room
    const oldRoom = activeSlots[slotId];
    console.log(`Assigning room ${roomName} to slot ${slotId}. Old room: ${oldRoom ? oldRoom.name : "none"}`);
    if(oldRoom && oldRoom.name !== roomName) {
        console.log(`Leaving old room ${oldRoom.name} from slot ${slotId}`);
        //check if the other slot has the same room
        const otherSlotId = slotId === 1 ? 2 : 1;
        const roomInOtherSlot = activeSlots[otherSlotId];
        if (!roomInOtherSlot || (roomInOtherSlot.name !== oldRoom.name)) {
            wt.leave(oldRoom.name);
            initializedRooms.delete(oldRoom.name);
        }
    }

    const joinedRoom = wt.join(roomName);

    activeSlots[slotId] = joinedRoom;

    const header = slotElement.querySelector(".slot-header");
    header.textContent = `Room: ${joinedRoom.name}`;

    const messagesArea = slotElement.querySelector(".slot-messages");
    //messagesArea.innerHTML = `<p style="margin: 5px 10px; color: gray;"><em>Joined ${joinedRoom.name}</em></p>`;

    updateRoomList();

    // Only subscribe to events if we havent done it
    if (!initializedRooms.has(roomName)) {
        initializedRooms.add(roomName);

        joinedRoom.onMessage((room, msg) => {
            if (activeSlots[1] && activeSlots[1].name === room.name) {
                appendMessageToUI(msg.sender, msg.message, document.getElementById("slot-1"));
            }
            if (activeSlots[2] && activeSlots[2].name === room.name) {
                appendMessageToUI(msg.sender, msg.message, document.getElementById("slot-2"));
            }
        });

        joinedRoom.onJoin((room, nickname) => {
            console.log(`${nickname} joined ${room.name}`);

            const newlyJoinedClient = room.clients.find(c => c.nickname === nickname);
            const isRegistered = newlyJoinedClient ? newlyJoinedClient.registered : false;

            if (activeSlots[1] && activeSlots[1].name === room.name) {
                displayJoinLeaveInSlot(1, `${nickname} joined ${room.name}`);
                const pList = document.getElementById("slot-1").querySelector(".participant-list");
                setupParticipantList(joinedRoom, slotElement);

            }
            if (activeSlots[2] && activeSlots[2].name === room.name) {
                displayJoinLeaveInSlot(2, `${nickname} joined ${room.name}`);
                const pList = document.getElementById("slot-2").querySelector(".participant-list");
                setupParticipantList(joinedRoom, slotElement);

            }
        });

        joinedRoom.onLeave((room, nickname) => {
            console.log(`${nickname} left ${room.name}`);

            if (activeSlots[1] && activeSlots[1].name === room.name) {
                displayJoinLeaveInSlot(1, `${nickname} left ${room.name}`);
                const pList = document.getElementById("slot-1").querySelector(".participant-list");
                removeParticipantFromUi(nickname, pList);
            }
            if (activeSlots[2] && activeSlots[2].name === room.name) {
                displayJoinLeaveInSlot(2, `${nickname} left ${room.name}`);
                const pList = document.getElementById("slot-2").querySelector(".participant-list");
                removeParticipantFromUi(nickname, pList);
            }
        });
    }
}


function clearChatMessageArea(slotId) {
    const slotElement = document.getElementById(`slot-${slotId}`);
    const messagesArea = slotElement.querySelector(".slot-messages");
    messagesArea.innerHTML = "";
}

// ----- Participation list functions ---

function addParticipantToUI(nickname, isRegistered, listElement) {
    const existing = Array.from(listElement.children).find(li => li.dataset.nickname === nickname);
    if (existing) return;

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
