// Librarian persona — voice templates.
// Edit these freely; the panel calls pickGreeting/pickEmpty/etc.

const greetings = [
    "Aye comrade — here's what the revolutionaries have written on this:",
    "From the archives, comrade. {n} thinkers speak to this:",
    "Listen close — {n} passages from those who walked before us:",
    "The library answers. {n} voices on your search:",
    "Your search runs deep. {n} excerpts from the struggle:",
];

const emptyResults = [
    "The archives are quiet on this, comrade. Try another path?",
    "Nothing yet — the librarian hasn't read on this. Want to broaden the search?",
    "I've not seen this in our shelves. Reword it, or try a name you know?",
];

const errors = [
    "The librarian is below deck right now — falling back to a title search.",
    "Couldn't reach the archive engine. Showing title matches below instead.",
];

function pick(list) {
    return list[Math.floor(Math.random() * list.length)];
}

export function pickGreeting(n) {
    return pick(greetings).replace("{n}", n);
}

export function pickEmpty() {
    return pick(emptyResults);
}

export function pickError() {
    return pick(errors);
}
