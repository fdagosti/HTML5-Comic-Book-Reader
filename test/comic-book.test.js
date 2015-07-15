let assert = require('assert')
let ComicBook = require('../app/comic-book')
let srcs = [
    'data:image/gif;base64,R0lGODlhAQABAPAAAKqqqv///yH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==',
    'data:image/gif;base64,R0lGODlhAQABAPAAALu7u////yH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==',
    'data:image/gif;base64,R0lGODlhAQABAPAAAMzMzP///yH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==',
    'data:image/gif;base64,R0lGODlhAQABAPAAAN3d3f///yH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==',
    'data:image/gif;base64,R0lGODlhAQABAPAAAO7u7v///yH5BAAAAAAALAAAAAABAAEAAAICRAEAOw=='
  ]

describe('ComicBook', function () {

  describe('preload images', function () {

    it('should preload all given image srcs and emit preload:image, preload:finish events', function (done) {
      let comic = new ComicBook(srcs)
      let loaded = []

      comic.on('preload:image', image => loaded.push(image.src))

      comic.on('preload:finish', function () {
        assert.deepEqual(loaded, srcs, 'all requested images should have been loaded')
        done()
      })

      comic.preload()
    })

    it('should only load a given amount of images at a time')

    it('should preload images in both directions')

    it('should emit a preload:start event', function (done) {
      let comic = new ComicBook(srcs)

      comic.on('preload:start', function () {
        assert(true, 'start event should have been emitted')
        done()
      })

      comic.preload()
    })

    it('should emit a preload:ready event')

    it('preload:ready should make sure that double page mode can show two images')
  })
})