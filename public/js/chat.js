const socket = io();

const $form = document.querySelector('#input-form');
const $formInput = $form.querySelector('input');
const $formSendButton = $form.querySelector('button');
const $locationButton = document.querySelector('#send-location');
const $messages = document.querySelector('#messages');

/* Client side js:
access to the querysring of the url: location.search
 */

/* Templates */
const messageTemplate = document.querySelector('#message-template').innerHTML;
const locationTemplate = document.querySelector('#location-template').innerHTML;
const sidebarTemplate = document.querySelector('#sidebar-template').innerHTML;

/* Options */
//ignoreQueryPrefix - removes the '?' from the query.
const { username, room } = Qs.parse(location.search, { ignoreQueryPrefix: true });

const autoScroll = () => {
	/* Grt the new message */
	const $newMessage = $messages.lastElementChild;

	/* Height of new message */
	const newMessageStyles = getComputedStyle($newMessage);
	const newMessageMargin = parseInt(newMessageStyles.marginBottom);
	const newMessageHeight = $newMessage.offsetHeight + newMessageMargin;

	/* Visible 	height */
	const visibleHeight = $messages.offsetHeight;

	/* Height container */
	const containerHeight = $messages.scrollHeight;

	/* How far we scrolled */
	const scrollOffset = $messages.scrollTop + visibleHeight;

	if (containerHeight - newMessageHeight <= scrollOffset) {
		$messages.scrollTop = $messages.scrollHeight;
	}
};

socket.on('message', (message) => {
	const html = Mustache.render(messageTemplate, {
		username: message.username,
		message: message.text,
		createdAt: moment(message.createdAt).format('hh:mm a')
	});
	$messages.insertAdjacentHTML('beforeend', html);
	autoScroll();
});

socket.on('locationMessage', (location) => {
	const html = Mustache.render(locationTemplate, {
		username: location.username,
		locationUrl: location.url,
		createdAt: moment(location.createdAt).format('hh:mm a')
	});
	$messages.insertAdjacentHTML('beforeend', html);
	autoScroll();
});

$form.addEventListener('submit', (e) => {
	e.preventDefault();

	$formSendButton.setAttribute('disabled', 'disabled');

	const message = $formInput.value;

	socket.emit('sendMessage', message, (error) => {
		$formSendButton.removeAttribute('disabled');
		$formInput.value = '';
		$formInput.focus();
		/*Callback function that triggers when acknowledgement */
		if (error) return console.log(error);

		console.log('message delivered!');
	});
});

$locationButton.addEventListener('click', () => {
	$locationButton.setAttribute('disabled', 'disabled');

	if (!navigator.geolocation) {
		return alert('Geolocation is not supported by your browser.');
	}

	navigator.geolocation.getCurrentPosition((position) => {
		socket.emit(
			'sendLocation',
			{ latitude: position.coords.latitude, longitude: position.coords.longitude },
			(message) => {
				$locationButton.removeAttribute('disabled');
				console.log(message);
			}
		);
	});
});

socket.emit('join', { username, room }, (error) => {
	if (error) {
		alert(error);
		location.href = '/';
	}
});

socket.on('roomData', ({ room, users }) => {
	const html = Mustache.render(sidebarTemplate, {
		room,
		users
	});

	document.querySelector('#sidebar').innerHTML = html;
});
