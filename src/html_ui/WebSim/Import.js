/**
 * HTML imports have been deprecated, we have to fetch the requested imports ourselves.
 */
new MutationObserver(function(mutationsList, observer) {
    for(const mutation of mutationsList) {
        for(const node of mutation.addedNodes) {
            if (node.constructor.name !== 'HTMLLinkElement') {
                continue;
            }
            if (node.outerHTML.indexOf('rel="import"') < 0) {
                continue;
            }
            fetch(node.href)
                .then(response => response.text())
                .then(data => {
                    let div = document.createElement('div');
                    div.baseURI=window.location.origin;
                    div.innerHTML = data;
                    document.head.appendChild(div)
                })
        }
   }
}).observe(document.head, {childList: true})
