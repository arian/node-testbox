
var expect = require('expect.js')

describe('DOM', function(){

	it('should create a new div element', function(){
		var el = document.createElement('div')
		expect(el.nodeType).to.be(1)
	})

	it('CAN I HAZ WEBM', function(){
		var video = document.createElement('video')
		expect(video.canPlayType('video/webm; codecs="vp8, vorbis"')).to.be.ok()
	})

})

