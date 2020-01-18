function open_tabbed_link(url)
{
    var win = window.open(url, '_blank');
    if (win) {
        //Browser has allowed it to be opened
        win.focus();
    } else {
        //Browser has blocked it
        alert('Browser blocked link from opening.');
    }
};