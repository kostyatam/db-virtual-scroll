import createRandomMessage from './utils/createRandomMessage'
import './style.styl'

const DB = {
  NAME: 'db',
  MESSAGES_STORE: 'messages'
}

const MARGIN = 20

open()
  .catch(err => console.log(err))
  .then((db) => {
    const container = document.getElementById('wrapper')
    const view = new View(container, db)
    view.render()
  })

function open () {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB.NAME, 1)

    request.onupgradeneeded = event => {
      const db = event.target.result
      const messageStore = db.createObjectStore('messages', {
        keyPath: 'id',
        autoIncrement: true
      })
      messageStore.createIndex('id', 'id', { unique: true })
      for(let i = 0; i < 10000; i++) {
        messageStore.add(createRandomMessage())
      }
    }

    request.onsuccess = e => resolve(event.target.result)
    request.onerror = e => reject("Database error: " + e.target.errorCode)
  })
}

class View {
  constructor(container, db) {
    this.container = container
    this.db = db
    this.containerHeight = this.container.clientHeight
    this.addListeners(container)
    this.topBounder = this.container.firstChild
    this.bottomBounder = this.container.lastChild
  }

  addListeners(container) {
    container.addEventListener('scroll', e => {
      const element = e.target
      const { firstChild, lastChild } = element
      if (firstChild.offsetHeight + firstChild.offsetTop >= element.scrollTop) {
        const id = element.childNodes[1].dataset.id
        const query = IDBKeyRange.upperBound(parseInt(id, 10), true)
        this.render(query, 'prev')
        this.removeNodes('bottom')
      }
      if (lastChild.offsetTop <= element.scrollTop + this.containerHeight) {
        const id = element.childNodes[element.childNodes.length - 2].dataset.id
        const query = IDBKeyRange.lowerBound(parseInt(id, 10), true)
        this.render(query, 'next')
        this.removeNodes('top')
      }
    }, 50)
  }

  removeNodes = debounce(direction => {
    const container = this.container
    const childNodes = [].slice.call(container.childNodes)

    for (let i = 1;  i < childNodes.length - 1; ++i) {
      const child = childNodes[i]
      const { offsetTop, offsetHeight } = child
      if (direction === 'top' && offsetTop + offsetHeight < container.scrollTop) {
        container.removeChild(child)
        this.incBounder('top', offsetHeight + MARGIN)
        continue
      }

      if (direction === 'bottom' && offsetTop > container.scrollTop + this.containerHeight) {
        container.removeChild(child)
        this.incBounder('bottom', offsetHeight + MARGIN)
        continue
      }
    }
  }, 100)

  incBounder(kind, height) {
    switch(kind) {
      case 'top':
        this.topBounder.style.height = parseInt(this.topBounder.style.height || 0) + height + 'px'
        break
      case 'bottom':
        this.bottomBounder.style.height = parseInt(this.bottomBounder.style.height || 0) + height + 'px'
        break
    }
  }

  decBounder(kind, height) {
    switch(kind) {
      case 'top': {
        const prevHeight = parseInt(this.topBounder.style.height || 0)
        const nextHeight = prevHeight - height
        this.topBounder.style.height = (nextHeight >= 0 ? nextHeight : prevHeight) + 'px'
        break
      }
      case 'bottom': {
        const prevHeight = parseInt(this.bottomBounder.style.height || 0)
        const nextHeight = prevHeight - height
        this.bottomBounder.style.height = (nextHeight >= 0 ? nextHeight : prevHeight) + 'px'
        break
      }
    }
  }

  render(query = null, direction = 'prev') {
    let height = 0
    this.db
    .transaction(DB.MESSAGES_STORE)
    .objectStore(DB.MESSAGES_STORE)
    .index('id')
    .openCursor(query, direction)
    .onsuccess = e => {
      const cursor = e.target.result
      if (cursor) {
        const { user, message, avatar, id } = cursor.value
        const div = document.createElement('div')
        div.className+='message'
        div.dataset.id = id
        div.innerHTML = `
          <div class="avatar" style="background-image: url(https:${avatar}.jpg)"></div>
          <div>
            <div class="user">
              ${user}
            </div>
            <div class="text">
              ${message}
            </div>
          </div>
        `
        if (direction === 'prev') {
          this.container.insertBefore(div, this.container.childNodes[1])
          height+= div.clientHeight + MARGIN
          if (height >= this.containerHeight) {
            this.decBounder('top', height)
            this.container.scrollTop = (height + this.topBounder.offsetHeight) - this.containerHeight
          }
        }

        if (direction === 'next') {
          this.container.insertBefore(div, this.container.lastChild)
          height+= div.clientHeight + MARGIN
          this.decBounder('bottom', height)
        }
        height <= this.containerHeight && cursor.continue()
      }
    }
  }
}

function debounce(func, wait, immediate) {
	let timeout
	return function() {
		const context = this, args = arguments
		const later = function() {
			timeout = null
			if (!immediate) func.apply(context, args)
		}
		const callNow = immediate && !timeout
		clearTimeout(timeout)
		timeout = setTimeout(later, wait)
		if (callNow) func.apply(context, args)
	}
}

function throttle(func, ms) {

  var isThrottled = false,
    savedArgs,
    savedThis;

  function wrapper() {

    if (isThrottled) { // (2)
      savedArgs = arguments;
      savedThis = this;
      return;
    }

    func.apply(this, arguments); // (1)

    isThrottled = true;

    setTimeout(function() {
      isThrottled = false; // (3)
      if (savedArgs) {
        wrapper.apply(savedThis, savedArgs);
        savedArgs = savedThis = null;
      }
    }, ms);
  }

  return wrapper;
}