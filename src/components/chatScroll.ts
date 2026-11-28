// Going to a message in a chat list (the quote of a reply leads there).
/** Goes to a message in the list and marks it for a moment. */
export const showMessage = (id: number) => {
    const el = document.getElementById(`m-${id}`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.remove('chat-flash'); void el.offsetWidth; el.classList.add('chat-flash');
};

