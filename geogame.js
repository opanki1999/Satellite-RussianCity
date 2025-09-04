
class GeoGame {
    constructor(mapContainerId, options = {}) {
        this.mapContainer = document.getElementById(mapContainerId);
        if (!this.mapContainer) {
            console.error(`Контейнер с id "${mapContainerId}" не найден!`);
            return;
        }

        // Настройки для России
        this.settings = {
            minLat: 41.0,
            maxLat: 65.5,
            minLon: 19.0,
            maxLon: 180.0,
            defaultZoom: 12,
            mapType: 'yandex#satellite',
            majorCitiesData: RussianCities,
            cityRadius: 0.01,
            cityProbability: 1.0
        };

        Object.assign(this.settings, options);
        this.map = null;
        this.currentCoords = null;
        this.currentCity = null;
        this.hintPlacemarks = []; // Массив для хранения меток подсказок
         this.currentPlacemark = null; // Текущая активная метка подсказки
    }

    // Генерация координат в населенных пунктах России
    generateRussianCoords() {
        let lat, lon;
        let selectedCity = null;

        // Проверяем, есть ли города в списке
        if (this.settings.majorCitiesData.length === 0) {
            console.error('Список городов пуст!');
            return [55.7558, 37.6173]; // Возвращаем координаты Москвы по умолчанию
        }

        const randomIndex = Math.floor(Math.random() * this.settings.majorCitiesData.length);
        selectedCity = this.settings.majorCitiesData[randomIndex];

        lat = (selectedCity.lat + (Math.random() * 2 - 1) * this.settings.cityRadius)
              .toFixed(6);
        lon = (selectedCity.lon + (Math.random() * 2 - 1) * this.settings.cityRadius)
              .toFixed(6);

        this.currentCoords = [parseFloat(lat), parseFloat(lon)];
        this.currentCity = selectedCity;

        return this.currentCoords;
    }

    // Инициализация карты
    initMap() {
        const targetCoords = this.generateRussianCoords();

        if (this.map) {
            this.map.destroy();
        }

        this.map = new ymaps.Map(this.mapContainer, {
            center: targetCoords,
            zoom: 11,
            type: this.settings.mapType,
            controls: [],
            behaviors: ['default']
        });

        this._configureMapAppearance();
        this._disableZoom();

        console.log('Координаты цели:', targetCoords);
        if (this.currentCity) {
            console.log('Город цели:', this.currentCity.name);
        }

        setTimeout(() => {
            if (this.map) {
                this.map.setZoom(this.settings.defaultZoom, {
                    duration: 2000, // Длительность анимации в ms
                    timingFunction: 'ease-in-out' // Плавное ускорение и замедление
                });
                this.map.container.fitToViewport();
            }
        }, 500); // Небольшая задержка перед началом анимации
        return this.map;
    }

    // Показать подсказку на карте
    showHintPlacemark(hint) {
        if (!this.map) return;

        // Удаляем предыдущие подсказки
        this.clearHints();

        // Создаем метку для подсказки
        this.currentPlacemark = new ymaps.Placemark(
            [hint.lat, hint.lon],
            {
                hintContent: hint.name,
                balloonContent: `
                    <strong>${hint.name}</strong><br>
                    ${hint.text}<br>
                    <em>Тип: ${this.getHintTypeName(hint.type)}</em>
                `
            },
            {
                preset: 'islands#yellowIcon',
                balloonCloseButton: true,
                hideIconOnBalloonOpen: false,
                balloonAutoPan: true,
                balloonOffset: [0, -40] // [смещение по X, смещение по Y]
            }
        );

        this.map.geoObjects.add(this.currentPlacemark);
        this.hintPlacemarks.push(this.currentPlacemark);

        // Центрируем карту на подсказке
        this.map.setCenter([hint.lat, hint.lon], this.settings.defaultZoom);

        // Автоматически открываем балун с подсказкой
        this.openHintBalloon();
    }

    // Автоматически открыть балун с подсказкой
    openHintBalloon() {
        if (this.currentPlacemark) {
            // Небольшая задержка для гарантии, что метка уже добавлена на карту
            setTimeout(() => {
                this.currentPlacemark.balloon.open();
            }, 100);
        }
    }
    // Закрыть балун подсказки
    closeHintBalloon() {
        if (this.currentPlacemark) {
            try {
                this.currentPlacemark.balloon.close();
            } catch (e) {
                console.log('Не удалось закрыть балун:', e);
            }
        }
    }

    // Очистить все подсказки
    clearHints() {
        if (this.map && this.hintPlacemarks.length > 0) {
            // Закрываем все открытые балуны
            this.hintPlacemarks.forEach(placemark => {
                try {
                    placemark.balloon.close();
                } catch (e) {
                    // Игнорируем ошибки закрытия
                }
                this.map.geoObjects.remove(placemark);
            });
            this.hintPlacemarks = [];
            this.currentPlacemark = null;
        }
    }
    // Вспомогательный метод для получения названия типа подсказки
    getHintTypeName(type) {
        const types = {
            'landmark': 'Достопримечательность',
            'museum': 'Музей',
            'historical': 'Историческое место',
            'religious': 'Религиозный объект',
            'nature': 'Природа',
            'industrial': 'Промышленность',
            'infrastructure': 'Инфраструктура',
            'education': 'Образование',
            'tourist': 'Туризм',
            'navigation': 'Навигация',
            'geography': 'География',
            'street': 'Улица',
            'park': 'Парк'
        };
        return types[type] || type;
    }
    // Приватный метод для настройки внешнего вида карты
    _configureMapAppearance() {
        this.map.events.add('load', () => {
            this.map.layers.each((layer) => {
                if (layer.getAllOverlays) {
                    const overlays = layer.getAllOverlays();
                    if (overlays) {
                        overlays.forEach(overlay => {
                            if (overlay.options && overlay.options.get('zIndex') > 100) {
                                overlay.options.set('visible', false);
                            }
                        });
                    }
                }
            });

            try {
                this.map.options.set('suppressMapOpenBlock', true);
            } catch (e) {}
        });
    }

    // Метод для блокировки zoom
    _disableZoom() {
        if (this.map) {
            this.map.behaviors.disable('scrollZoom');
            this.map.behaviors.disable('dblClickZoom');
            this.map.behaviors.disable('multiTouch');
        }
    }

    // Метод для включения zoom
    enableZoom() {
        if (this.map) {
            this.map.behaviors.enable('scrollZoom');
            this.map.behaviors.enable('dblClickZoom');
        }
    }
    // Уничтожить карту!Нужен
    destroyMap() {
        this.clearHints();
        if (this.map) {
            this.map.destroy();
            this.map = null;
        }
    }

    // Сброс игры
    resetGame() {
        this.destroyMap();
        this.currentCoords = null;
        this.currentCity = null;
        this.hintPlacemarks = [];
    }

    // Получение текущего города
    getCurrentCity() {
        return this.currentCity;
    }
}
    // Глобальные переменные
    let game;
    let currentHints = [];
    let currentHintIndex = 0;
    let currentMapType = 'satellite';
    let allCities = [];
    let citySearchIndex = null;
    let allCityStats = [];
    let filteredCityStats = [];
    let quizOptions = [];
let correctQuizIndex = -1;
    // Firebase
        let firestore = null;
        let auth = null;
        let currentUser = null;
        let isFirebaseInitialized = false;

    // Настройки Firebase
    const firebaseConfig = {
        apiKey: "AIzaSyAh4GvJgped_UTCAZeCa3P-ujbqWG06Kis",
        authDomain: "satelitter-94a9a.firebaseapp.com",
        projectId: "satelitter-94a9a",
        storageBucket: "satelitter-94a9a.firebasestorage.app",
        messagingSenderId: "985966199038",
        appId: "1:985966199038:web:e5ebfbf8adf3605fc5e5af"
    };
    // Инициализация Firebase
function initializeFirebase() {
    try {
        if (!isFirebaseInitialized) {
            // Используем compat-версию для инициализации
            firebase.initializeApp(firebaseConfig);
            firestore = firebase.firestore; // compat версия
            auth = firebase.auth; // compat версия
            isFirebaseInitialized = true;
            console.log('Firebase инициализирован');

            // Настраиваем анонимную аутентификацию
            setupAnonymousAuth();
        }
    } catch (error) {
        console.error('Ошибка инициализации Firebase:', error);
    }
}

// Анонимная аутентификация
function setupAnonymousAuth() {
    // Используем auth() для доступа к сервису
    auth().signInAnonymously()
        .then((userCredential) => {
            console.log('Анонимная аутентификация успешна');
            currentUser = userCredential.user;

            // Инициализируем статистику пользователя
            initializeUserStats();
        })
        .catch((error) => {
            console.error('Ошибка анонимной аутентификации:', error);
        });
}

// Инициализация статистики пользователя
async function initializeUserStats() {
    if (!currentUser) return;

    try {
        // Используем firestore() для доступа к сервису
        const userStatsRef = firestore().collection('UserStats').doc(currentUser.uid);
        const doc = await userStatsRef.get();

        if (!doc.exists) {
            // Создаем новую запись статистики
            await userStatsRef.set({
                UserId: currentUser.uid,
                BestWinstreak: 0,
                CorrectPlays: 0,
                CurrentWinstreak: 0,
                IncorrectPlays: 0,
                TotalPlays: 0,
                CreatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                LastUpdated: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log('Создана новая запись статистики пользователя');
        }
    } catch (error) {
        console.error('Ошибка инициализации статистики пользователя:', error);
    }
}

// Обновление статистики пользователя в Firebase
async function updateFirebaseStats(isCorrect) {
    if (!currentUser || !firestore) {
        console.log('Firebase не инициализирован, пропускаем обновление статистики');
        return;
    }

    try {
        const userStatsRef = firestore().collection('UserStats').doc(currentUser.uid);

        // Получаем текущую статистику
        const doc = await userStatsRef.get();
        if (!doc.exists) {
            console.log('Статистика пользователя не найдена');
            return;
        }

        const currentStats = doc.data();
        const updateData = {
            LastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        };

        // Обновляем статистику
        updateData.TotalPlays = (currentStats.TotalPlays || 0) + 1;

        if (isCorrect) {
            updateData.CorrectPlays = (currentStats.CorrectPlays || 0) + 1;
            updateData.CurrentWinstreak = (currentStats.CurrentWinstreak || 0) + 1;

            // Обновляем лучшую серию, если текущая больше
            if (updateData.CurrentWinstreak > (currentStats.BestWinstreak || 0)) {
                updateData.BestWinstreak = updateData.CurrentWinstreak;
            }
        } else {
            updateData.IncorrectPlays = (currentStats.IncorrectPlays || 0) + 1;
            updateData.CurrentWinstreak = 0;
        }

        // Обновляем документ
        await userStatsRef.update(updateData);
        console.log('Статистика обновлена в Firebase:', updateData);

    } catch (error) {
        console.error('Ошибка обновления статистики в Firebase:', error);
    }
}

async function getFirebaseStats() {
    if (!currentUser || !firestore) {
        console.log('Firebase не инициализирован');
        return null;
    }

    try {
        const userStatsRef = firestore().collection('UserStats').doc(currentUser.uid);
        const doc = await userStatsRef.get();

        if (doc.exists) {
            return doc.data();
        } else {
            console.log('Статистика пользователя не найдена в Firebase');
            return null;
        }
    } catch (error) {
        console.error('Ошибка получения статистики из Firebase:', error);
        return null;
    }
}


    // Настройки игры
    let gameSettings = {
        mapType: 'satellite',
        attemptsCount: 3,
        difficultyLevel: 2,
        hintsEnabled: true,
        autoRestart: false, // Новая настройка
        remainingAttempts: 3,
        quizMode: false
    };
    // Функции для приветственного модального окна
    function showWelcomeModal() {
    console.log('showWelcomeModal() вызвана');
    const hasSeenWelcome = localStorage.getItem('hasSeenWelcome');

    if (!hasSeenWelcome) {
        const modal = document.getElementById('welcomeModal');
        modal.style.display = 'flex';

        // Сохраняем флаг что пользователь увидел приветствие
        localStorage.setItem('hasSeenWelcome', 'true');
    }
}


// Функция для  флага сброса приветствия (может пригодиться для тестирования)
function resetWelcome() {
    localStorage.removeItem('hasSeenWelcome');
    localStorage.removeItem('dontShowWelcome');
    showWelcomeModal();
}
    // Функции инициализации
    function initializeGame() {
        console.log('API Яндекс.Карт загружено');

        // Инициализируем Firebase
    initializeFirebase();

        // Загрузка настроек из localStorage
        loadSettings();

        // Инициализация поискового индекса
        initCitySearch();

        game = new GeoGame('map', {
            mapType: 'yandex#' + gameSettings.mapType,
            defaultZoom: 15
        });

        startNewGame();
        setupEventListeners();
        updateUIFromSettings();
<!--        resetWelcome()-->
        showWelcomeModal();
    }

    function loadSettings() {
    const savedSettings = localStorage.getItem('geoGameSettings');
    if (savedSettings) {
        try {
            const parsed = JSON.parse(savedSettings);
            gameSettings = {...gameSettings, ...parsed};
            gameSettings.remainingAttempts = gameSettings.attemptsCount;
        } catch (e) {
            console.error('Ошибка загрузки настроек:', e);
        }
    }

    // Обновляем значения в форме настроек
    document.getElementById('mapType').value = gameSettings.mapType;
    document.getElementById('attemptsCount').value = gameSettings.attemptsCount;
    document.getElementById('difficultyLevel').value = gameSettings.difficultyLevel;
    document.getElementById('hintsEnabled').value = gameSettings.hintsEnabled.toString();
    document.getElementById('autoRestart').value = gameSettings.autoRestart.toString();
    document.getElementById('quizMode').value = gameSettings.quizMode.toString(); // Новая строка
}

    function saveSettings() {
    gameSettings.mapType = document.getElementById('mapType').value;
    gameSettings.attemptsCount = parseInt(document.getElementById('attemptsCount').value);
    gameSettings.difficultyLevel = parseInt(document.getElementById('difficultyLevel').value);
    gameSettings.hintsEnabled = document.getElementById('hintsEnabled').value === 'true';
    gameSettings.autoRestart = document.getElementById('autoRestart').value === 'true';
    gameSettings.quizMode = document.getElementById('quizMode').value === 'true'; // Новая строка
    gameSettings.remainingAttempts = gameSettings.attemptsCount;

    // Сохраняем в localStorage
    localStorage.setItem('geoGameSettings', JSON.stringify({
        mapType: gameSettings.mapType,
        attemptsCount: gameSettings.attemptsCount,
        difficultyLevel: gameSettings.difficultyLevel,
        hintsEnabled: gameSettings.hintsEnabled,
        autoRestart: gameSettings.autoRestart,
        quizMode: gameSettings.quizMode // Новая строка
    }));

    updateUIFromSettings();
    toggleSettings(true);
    startNewGame();
}

    function updateUIFromSettings() {
    // Обновляем кнопку подсказок
    const hintButton = document.getElementById('hintButton');
    hintButton.style.display = gameSettings.hintsEnabled ? 'block' : 'none';

    // Обновляем видимость поля ввода и викторины
    const cityInput = document.getElementById('cityGuess');
    const autocompleteContainer = document.querySelector('.autocomplete-container');
    const quizContainer = document.getElementById('quizOptions');
    const checkButton = document.querySelector('.search-row button'); // Кнопка "Проверить"
    const attemptsCounter = document.getElementById('attemptsCounter');

    if (gameSettings.quizMode) {
        cityInput.style.display = 'none';
        autocompleteContainer.style.display = 'none';
        quizContainer.style.display = 'block';
        checkButton.style.display = 'none'; // Скрываем кнопку "Проверить"
        attemptsCounter.style.display = 'none'; // Скрываем счетчик попыток
    } else {
        cityInput.style.display = 'block';
        autocompleteContainer.style.display = 'block';
        quizContainer.style.display = 'none';
        checkButton.style.display = 'block'; // Показываем кнопку "Проверить"

        // Обновляем видимость счетчика попыток
        if (gameSettings.attemptsCount === 999) {
            attemptsCounter.style.display = 'none';
        } else {
            attemptsCounter.style.display = 'block';
            attemptsLeft.textContent = gameSettings.remainingAttempts;
        }
    }

    // Обновляем видимость кнопки "Показать ответ"
    updateRevealButtonVisibility();
}

    function updateRevealButtonVisibility() {
        const revealButton = document.querySelector('.controls-row button:nth-child(2)');
        if (revealButton) {
            // Показываем кнопку "Показать ответ" ТОЛЬКО при неограниченных попытках
            revealButton.style.display = gameSettings.attemptsCount === 999 ? 'block' : 'none';
        }
    }

    function initCitySearch() {
        allCities = RussianCities.map(city => city.name);
        citySearchIndex = allCities.map(city => ({
            original: city,
            lower: city.toLowerCase()
        }));
        console.log('Загружено городов для автодополнения:', allCities.length);
    }

    function setupEventListeners() {
        const cityInput = document.getElementById('cityGuess');
        const autocompleteList = document.getElementById('autocompleteList');

        cityInput.addEventListener('input', handleCityInput);
        cityInput.addEventListener('focus', handleCityFocus);
        cityInput.addEventListener('blur', handleCityBlur);
        cityInput.addEventListener('keydown', handleCityKeydown);

        autocompleteList.addEventListener('blur', handleAutocompleteBlur, true);

        // Закрытие меню настроек при клике вне его
        document.addEventListener('click', function(event) {
            const settingsMenu = document.getElementById('settingsMenu');
            const settingsButton = document.querySelector('.settings-button');

            if (settingsMenu.style.display === 'block' &&
                !settingsMenu.contains(event.target) &&
                !settingsButton.contains(event.target)) {
                toggleSettings(true);
            }
        });
        document.addEventListener('click', function(event) {
        const modal = document.getElementById('welcomeModal');
        const modalContent = document.querySelector('.modal-content');

        if (modal.style.display === 'flex' &&
            !modalContent.contains(event.target) &&
            event.target !== document.getElementById('dontShowAgain')) {
            closeModal('welcomeModal');
        }
    });

    // Закрытие модальных окон по клавише Escape
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            const openModals = document.querySelectorAll('.modal[style="display: flex;"]');
            if (openModals.length > 0) {
                closeModal(openModals[0].id);
            }

            // Также закрываем меню настроек если открыто
            const settingsMenu = document.getElementById('settingsMenu');
            if (settingsMenu.style.display === 'block') {
                toggleSettings(true);
            }

            // Закрываем автодополнение если открыто
            const autocompleteList = document.getElementById('autocompleteList');
            if (autocompleteList.style.display !== 'none') {
                autocompleteList.style.display = 'none';
            }
        }
    });
    }

    // Функции для меню настроек
    function toggleSettings(forceClose = false) {
    const menu = document.getElementById('settingsMenu');

    if (forceClose) {
        menu.style.display = 'none';
    } else {
        menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
    }
}


    // Обработчики событий
    function handleCityInput() {
        showAutocomplete(this.value);
    }

    function handleCityFocus() {
        if (this.value.length > 0) {
            showAutocomplete(this.value);
        }
    }

    function handleCityBlur() {
        setTimeout(() => {
            const autocompleteList = document.getElementById('autocompleteList');
            if (!autocompleteList.contains(document.activeElement)) {
                autocompleteList.style.display = 'none';
            }
        }, 300);
    }

    function handleAutocompleteBlur(e) {
        if (!this.contains(e.relatedTarget)) {
            this.style.display = 'none';
        }
    }

    function handleCityKeydown(e) {
        const autocompleteList = document.getElementById('autocompleteList');
        const items = document.querySelectorAll('.autocomplete-item');

        if (e.key === 'Enter') {
            e.preventDefault();
            checkCityGuess();
        } else if (e.key === 'ArrowDown' && autocompleteList.style.display !== 'none') {
            e.preventDefault();
            if (items.length > 0) {
                focusNextAutocompleteItem(1);
            }
        } else if (e.key === 'ArrowUp' && autocompleteList.style.display !== 'none') {
            e.preventDefault();
            if (items.length > 0) {
                focusNextAutocompleteItem(-1);
            }
        } else if (e.key === 'Escape' && autocompleteList.style.display !== 'none') {
            e.preventDefault();
            autocompleteList.style.display = 'none';
            this.focus();
        }
    }

    function handleAutocompleteKey(event, cityName) {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            selectCity(cityName);
        } else if (event.key === 'ArrowDown') {
            event.preventDefault();
            focusNextAutocompleteItem(1);
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            focusNextAutocompleteItem(-1);
        } else if (event.key === 'Escape') {
            document.getElementById('autocompleteList').style.display = 'none';
            document.getElementById('cityGuess').focus();
        }
    }

    // Функции автодополнения
    function showAutocomplete(inputText) {
        const autocompleteList = document.getElementById('autocompleteList');

        if (inputText.length < 2) {
            autocompleteList.style.display = 'none';
            return;
        }

        const searchTerm = inputText.toLowerCase();
        const filteredCities = citySearchIndex
            .filter(item => item.lower.includes(searchTerm))
            .sort((a, b) => {
                const aStarts = a.lower.startsWith(searchTerm);
                const bStarts = b.lower.startsWith(searchTerm);
                if (aStarts && !bStarts) return -1;
                if (!aStarts && bStarts) return 1;
                return a.lower.localeCompare(b.lower);
            })
            .slice(0, 10)
            .map(item => item.original);

        if (filteredCities.length === 0) {
            autocompleteList.style.display = 'none';
            return;
        }

        autocompleteList.innerHTML = filteredCities.map(city =>
            `<div class="autocomplete-item" tabindex="0"
                  onclick="selectCity('${city}')"
                  onkeydown="handleAutocompleteKey(event, '${city}')">
                ${city}
            </div>`
        ).join('');

        autocompleteList.style.display = 'block';
    }

    function selectCity(cityName) {
        document.getElementById('cityGuess').value = cityName;
        document.getElementById('autocompleteList').style.display = 'none';

        // Убираем активный класс со всех элементов
        document.querySelectorAll('.autocomplete-item').forEach(item => {
            item.classList.remove('active');
        });

        document.getElementById('cityGuess').focus();
    }

    function focusNextAutocompleteItem(direction) {
        const items = document.querySelectorAll('.autocomplete-item');
        if (items.length === 0) return;

        let currentIndex = -1;

        // Находим текущий активный элемент
        items.forEach((item, index) => {
            if (item.classList.contains('active')) {
                currentIndex = index;
                item.classList.remove('active');
            }
        });

        // Вычисляем следующий индекс
        let nextIndex;
        if (currentIndex === -1) {
            nextIndex = direction > 0 ? 0 : items.length - 1;
        } else {
            nextIndex = currentIndex + direction;
            if (nextIndex < 0) nextIndex = items.length - 1;
            if (nextIndex >= items.length) nextIndex = 0;
        }

        // Устанавливаем фокус и активный класс
        items[nextIndex].classList.add('active');
        items[nextIndex].focus();
        items[nextIndex].scrollIntoView({ block: 'nearest' });
    }

    // Функция автообновления игры
    function scheduleAutoRestart() {
    if (gameSettings.autoRestart) {
        // Показываем обратный отсчет
        const resultElement = document.getElementById('result');
        const originalHtml = resultElement.innerHTML;
        let secondsLeft = 3;

        const countdownInterval = setInterval(() => {
            resultElement.innerHTML = `${originalHtml}<br><small>Новая игра через ${secondsLeft}...</small>`;
            secondsLeft--;

            if (secondsLeft < 0) {
                clearInterval(countdownInterval);

                // Скрываем мини-карту перед началом новой игры
                const miniMapContainer = document.getElementById('miniMap');
                miniMapContainer.style.display = 'none';

                // Удаляем мини-карту
                if (window.miniMapInstance) {
                    try {
                        window.miniMapInstance.destroy();
                        window.miniMapInstance = null;
                    } catch (e) {
                        console.log('Ошибка при удалении мини-карты:', e);
                    }
                }

                startNewGame();
            }
        }, 1000);
    }
}

    // Основные игровые функции
    function startNewGame() {
    console.log('Запуск новой игры');

    // Скрываем мини-карту если она была показана
    const miniMapContainer = document.getElementById('miniMap');
    miniMapContainer.style.display = 'none';

    // Удаляем предыдущую мини-карту если она существует
    if (window.miniMapInstance) {
        try {
            window.miniMapInstance.destroy();
            window.miniMapInstance = null;
        } catch (e) {
            console.log('Ошибка при удалении мини-карты:', e);
        }
    }

    // Очищаем контейнер мини-карты
    miniMapContainer.innerHTML = '';

    if (game) {
        game.resetGame();

        // Фильтруем города по уровню сложности
        const filteredCities = RussianCities.filter(city =>
            city.difficulty <= gameSettings.difficultyLevel
        );

        // Проверяем, есть ли города после фильтрации
        if (filteredCities.length === 0) {
            console.error('Нет городов для выбранного уровня сложности!');
            document.getElementById('result').innerHTML =
                '<div class="error">Нет городов для выбранного уровня сложности. Измените настройки.</div>';
            return;
        }

        // Обновляем список городов в игре
        game.settings.majorCitiesData = filteredCities;

        game.initMap();
        document.getElementById('result').innerHTML = '';
        document.getElementById('cityGuess').value = '';
        document.getElementById('autocompleteList').style.display = 'none';
        document.getElementById('hintInfo').style.display = 'none';
        document.getElementById('hintInfo').innerHTML = '';

        // Сброс счетчика попыток
        gameSettings.remainingAttempts = gameSettings.attemptsCount;
        updateUIFromSettings();

        currentHintIndex = 0;

        const targetCity = game.getCurrentCity();

        if (!targetCity) {
            console.error('Не удалось получить целевой город!');
            document.getElementById('result').innerHTML =
                '<div class="error">Ошибка загрузки города. Попробуйте еще раз.</div>';
            return;
        }

        console.log('Целевой город:', targetCity.name);

        // Загружаем подсказки для города
        if (window.hasHintsForCity && window.hasHintsForCity(targetCity.name)) {
            currentHints = window.getHintsForCity(targetCity.name);
            console.log('Загружено подсказок:', currentHints.length);
        } else {
            currentHints = [];
            console.log('Для города нет подсказок');
        }

        // Генерируем варианты для викторины, если режим включен
        if (gameSettings.quizMode) {
            console.log('Режим викторины активен, генерируем варианты...');

            // Небольшая задержка для гарантии, что DOM полностью готов
            setTimeout(() => {
                generateQuizOptions(targetCity);
            }, 100);
        } else {
            // В обычном режиме фокусируемся на поле ввода
            setTimeout(() => {
                document.getElementById('cityGuess').focus();
            }, 100);
        }

        currentMapType = gameSettings.mapType;
        setTimeout(hideMapControls, 0);
    } else {
        console.error('Игра не инициализирована!');
        document.getElementById('result').innerHTML =
            '<div class="error">Ошибка инициализации игры. Перезагрузите страницу.</div>';
    }
}

    function showHint() {
        if (!gameSettings.hintsEnabled) {
            alert('Подсказки отключены в настройках');
            return;
        }

        if (currentHints.length === 0) {
            alert('Для этого города нет подсказок');
            return;
        }

        if (currentHintIndex >= currentHints.length) {
            currentHintIndex = 0;
        }

        const hint = currentHints[currentHintIndex];
        currentHintIndex++;
        game.showHintPlacemark(hint);
    }

    function checkCityGuess() {
    // Проверяем остаток попыток
    if (gameSettings.attemptsCount !== 999 && gameSettings.remainingAttempts <= 0) {
        const targetCity = game.getCurrentCity();
        document.getElementById('result').innerHTML = `Попытки закончились! Начните новую игру. Это ${targetCity.name}`;
        document.getElementById('result').className = 'incorrect';

        // Обновляем статистику (не угадал)
        updateGameStats(false, targetCity);

        // Показываем мини-карту при окончании попыток
        showMiniMap(targetCity);

        scheduleAutoRestart(); // Автообновление
        return;
    }

    const userGuess = document.getElementById('cityGuess').value.trim();
    const targetCity = game.getCurrentCity();

    if (!targetCity) {
        document.getElementById('result').innerHTML = 'Информация о городе недоступна';
        return;
    }

    const isCorrect = userGuess.toLowerCase() === targetCity.name.toLowerCase();

    if (isCorrect) {
        document.getElementById('result').innerHTML = `✅ Правильно! Это ${targetCity.name}`;
        document.getElementById('result').className = 'correct';

        // Обновляем статистику (угадал)
        updateGameStats(true, targetCity);

        // Показываем мини-карту при правильном ответе
        showMiniMap(targetCity);

        scheduleAutoRestart(); // Автообновление
    } else {
        // Уменьшаем счетчик попыток
        if (gameSettings.attemptsCount !== 999) {
            gameSettings.remainingAttempts--;
            updateUIFromSettings();
        }

        if (gameSettings.attemptsCount !== 999 && gameSettings.remainingAttempts <= 0) {
            document.getElementById('result').innerHTML = `Попытки закончились! Начните новую игру. Это ${targetCity.name}`;

            // Обновляем статистику (не угадал)
            updateGameStats(false, targetCity);

            // Показываем мини-карту при окончании попыток
            showMiniMap(targetCity);

            scheduleAutoRestart(); // Автообновление
        } else {
            // Обновляем статистику просмотренных городов (если еще есть попытки)
            const stats = JSON.parse(localStorage.getItem('gameStats') || '{}');
            if (!stats.seenCities) stats.seenCities = {};
            if (!stats.seenCities[targetCity.name]) {
                stats.seenCities[targetCity.name] = {
                    name: targetCity.name,
                    firstSeen: new Date().toISOString(),
                    timesSeen: 1
                };
            } else {
                stats.seenCities[targetCity.name].timesSeen += 1;
                stats.seenCities[targetCity.name].lastSeen = new Date().toISOString();
            }
            localStorage.setItem('gameStats', JSON.stringify(stats));

            if (gameSettings.attemptsCount === 999) {
                document.getElementById('result').innerHTML = `❌ Неправильно. Вы ввели: ${userGuess}`;
            } else {
                document.getElementById('result').innerHTML = `❌ Неправильно. Вы ввели: ${userGuess}. Осталось попыток: ${gameSettings.remainingAttempts}`;
            }
        }
        document.getElementById('result').className = 'incorrect';
    }

    // Скрываем автодополнение после проверки
    document.getElementById('autocompleteList').style.display = 'none';
}

    function revealAnswer() {
    if (game) {
        const targetCity = game.getCurrentCity();
        if (targetCity) {
            document.getElementById('result').innerHTML =
                `<div class="answer-text">${targetCity.name.toUpperCase()}</div>`;
            document.getElementById('result').className = 'answer';

            // В режиме викторины показываем правильный ответ на кнопках
            if (gameSettings.quizMode) {
                const quizButtons = document.querySelectorAll('.quiz-option');
                quizButtons.forEach((button, index) => {
                    button.disabled = true;
                    if (index === correctQuizIndex) {
                        button.classList.add('correct');
                    }
                });
            }

            showMiniMap(targetCity);
            scheduleAutoRestart();
        }
    }
}
//функция для отображения мини-карты
function showMiniMap(city) {
    const miniMapContainer = document.getElementById('miniMap');
    miniMapContainer.style.display = 'block';

    // Удаляем предыдущую мини-карту если она существует
    if (window.miniMapInstance) {
        try {
            window.miniMapInstance.destroy();
            window.miniMapInstance = null;
        } catch (e) {
            console.log('Ошибка при удалении мини-карты:', e);
        }
    }

    // Очищаем контейнер мини-карты
    miniMapContainer.innerHTML = '';

    // Создаем новый контейнер для карты
    const mapElement = document.createElement('div');
    mapElement.style.width = '100%';
    mapElement.style.height = '100%';
    miniMapContainer.appendChild(mapElement);

    // Создаем мини-карту
    const miniMap = new ymaps.Map(mapElement, {
        center: [city.lat, city.lon],
        zoom: 5,
        controls: []
    });

    // Добавляем метку города
    const placemark = new ymaps.Placemark(
        [city.lat, city.lon],
        {
            hintContent: city.name,
            balloonContent: city.name
        },
        {
            preset: 'islands#redIcon'
        }
    );

    miniMap.geoObjects.add(placemark);

    // Отключаем все элементы управления и поведения
    miniMap.behaviors.disable(['scrollZoom', 'dblClickZoom', 'drag']);

    // Скрываем все элементы управления
    miniMap.controls.remove('zoomControl');
    miniMap.controls.remove('typeSelector');
    miniMap.controls.remove('fullscreenControl');

    // Сохраняем ссылку на мини-карту для последующего удаления
    window.miniMapInstance = miniMap;
}
    // Вспомогательные функции
    function hideMapControls() {
        const mapContainer = document.getElementById('map');
        if (mapContainer) {
            const controls = mapContainer.querySelectorAll('[class*="control"], [class*="copyright"]');
            controls.forEach(element => {
                element.style.display = 'none';
            });
        }
    }
// Функции для статистики
function updateGameStats(isCorrect, city) {
    const stats = JSON.parse(localStorage.getItem('gameStats') || '{}');

    // Базовая статистика
    stats.totalGames = (stats.totalGames || 0) + 1;
    if (isCorrect) {
        stats.correctGames = (stats.correctGames || 0) + 1;
        stats.currentStreak = (stats.currentStreak || 0) + 1;
        stats.bestStreak = Math.max(stats.bestStreak || 0, stats.currentStreak);

        // Добавляем город в отгаданные
        if (!stats.guessedCities) stats.guessedCities = {};
        stats.guessedCities[city.name] = {
            name: city.name,
            timestamp: new Date().toISOString(),
            attempts: gameSettings.attemptsCount - gameSettings.remainingAttempts + 1
        };
    } else {
        stats.currentStreak = 0;
    }

    // Добавляем город в просмотренные
    if (!stats.seenCities) stats.seenCities = {};
    if (!stats.seenCities[city.name]) {
        stats.seenCities[city.name] = {
            name: city.name,
            firstSeen: new Date().toISOString(),
            timesSeen: 1
        };
    } else {
        stats.seenCities[city.name].timesSeen += 1;
        stats.seenCities[city.name].lastSeen = new Date().toISOString();
    }

    // Сохраняем обновленную статистику
    localStorage.setItem('gameStats', JSON.stringify(stats));
    updateCityStats(city, isCorrect);
    // Синхронизируем с Firebase
    updateFirebaseStats(isCorrect);

    return stats;
}

function getGameStats() {
    return JSON.parse(localStorage.getItem('gameStats') || '{}');
}

// Модифицируем функцию showStatsModal для отображения статистики из Firebase
async function showStatsModal() {
    const modal = document.getElementById('statsModal');

    if (!modal) {
        console.error('Модальное окно статистики не найдено');
        return;
    }

    // Получаем статистику из Firebase
    const firebaseStats = await getFirebaseStats();
    const localStats = getGameStats();

    // Определяем статус Firebase
    let firebaseStatus = '⚠️ Firebase не подключен';
    let statusClass = 'firebase-warning';

    if (currentUser && currentUser.uid.startsWith('local-user-')) {
        firebaseStatus = '⚠️ Firebase Authentication не настроен';
        statusClass = 'firebase-warning';
    } else if (firebaseStats) {
        firebaseStatus = '✅ Данные синхронизированы';
        statusClass = 'firebase-success';
    }

    // Используем данные из Firebase по умолчанию, если они есть
    const totalGames = firebaseStats ? firebaseStats.TotalPlays : (localStats.totalGames || 0);
    const correctGames = firebaseStats ? firebaseStats.CorrectPlays : (localStats.correctGames || 0);
    const currentStreak = firebaseStats ? firebaseStats.CurrentWinstreak : (localStats.currentStreak || 0);
    const bestStreak = firebaseStats ? firebaseStats.BestWinstreak : (localStats.bestStreak || 0);

    const accuracy = totalGames > 0 ? Math.round((correctGames / totalGames) * 100) : 0;

    const statsContent = `
        <div class="stats-grid">
            <div class="stat-item">
                <h3>🎯 Всего игр</h3>
                <span class="stat-number">${totalGames}</span>
                ${firebaseStats ? '' : `<small>Локальные данные</small>`}
            </div>
            <div class="stat-item">
                <h3>✅ Правильно</h3>
                <span class="stat-number">${correctGames}</span>
                <span class="stat-percent">${accuracy}%</span>
                ${firebaseStats ? '' : `<small>Локальные данные</small>`}
            </div>
            <div class="stat-item">
                <h3>🔥 Текущая серия</h3>
                <span class="stat-number">${currentStreak}</span>
                ${firebaseStats ? '' : `<small>Локальные данные</small>`}
            </div>
            <div class="stat-item">
                <h3>🏆 Лучшая серия</h3>
                <span class="stat-number">${bestStreak}</span>
                ${firebaseStats ? '' : `<small>Локальные данные</small>`}
            </div>
        </div>

        <div class="stats-details">
            <h3>📊 Детальная статистика</h3>
            <p>Отгадано городов: ${localStats.guessedCities ? Object.keys(localStats.guessedCities).length : 0}</p>
            <p>Просмотрено городов: ${localStats.seenCities ? Object.keys(localStats.seenCities).length : 0}</p>
            <p class="${statusClass}">${firebaseStatus}</p>
            ${!firebaseStats ? '<p class="firebase-info">Для облачного сохранения статистики настройте Firebase Authentication</p>' : ''}
        </div>
    `;

    modal.querySelector('.modal-body').innerHTML = statsContent;
    modal.style.display = 'flex';
}

async function resetStats() {
    if (confirm('Вы уверены, что хотите сбросить ВСЮ статистику? Это действие нельзя отменить.')) {
        try {
            // Получаем текущую локальную статистику перед сбросом
            const localStats = JSON.parse(localStorage.getItem('gameStats') || '{}');

            // Сбрасываем локальную статистику
            localStorage.removeItem('gameStats');

            // Сбрасываем статистику в Firebase, если подключены
            if (isFirebaseInitialized && currentUser && !currentUser.uid.startsWith('local-user-') && firestore) {
                try {
                    const userStatsRef = firestore().collection('UserStats').doc(currentUser.uid);
                    await userStatsRef.set({
                        UserId: currentUser.uid,
                        BestWinstreak: 0,
                        CorrectPlays: 0,
                        CurrentWinstreak: 0,
                        IncorrectPlays: 0,
                        TotalPlays: 0,
                        CreatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                        LastUpdated: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    console.log('Статистика Firebase сброшена');
                } catch (firebaseError) {
                    console.error('Ошибка сброса статистики Firebase:', firebaseError);
                    // Продолжаем даже если не удалось сбросить Firebase
                }
            }

            // Сбрасываем текущие счетчики в gameSettings
            gameSettings.remainingAttempts = gameSettings.attemptsCount;

            // Сбрасываем текущую серию в новой локальной статистике
            const newStats = {
                totalGames: 0,
                correctGames: 0,
                currentStreak: 0,
                bestStreak: 0,
                seenCities: {},
                guessedCities: {}
            };
            localStorage.setItem('gameStats', JSON.stringify(newStats));

            // Обновляем UI
            updateUIFromSettings();

            // Если окно статистики открыто - обновляем его содержимое
            const statsModal = document.getElementById('statsModal');
            if (statsModal && statsModal.style.display === 'flex') {
                showStatsModal(); // Перерисовываем содержимое с нулевой статистикой
            }

            alert('Вся статистика сброшена!');

        } catch (error) {
            console.error('Ошибка при сбросе статистики:', error);
            alert('Произошла ошибка при сбросе статистики. Попробуйте еще раз.');
        }
    }
}

// Универсальная функция закрытия модального окна
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';

        // Особые действия для определенных модальных окон
        if (modalId === 'welcomeModal') {
            const dontShowAgain = document.getElementById('dontShowAgain').checked;
            if (dontShowAgain) {
                localStorage.setItem('dontShowWelcome', 'true');
            }
            // Фокусируемся на поле ввода после закрытия приветствия
            setTimeout(() => {
                document.getElementById('cityGuess').focus();
            }, 100);
        }
    }
}

// Универсальная функция открытия модального окна
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

async function updateCityStats(city, isCorrect) {
    if (!currentUser || !firestore) {
        console.log('Firebase не инициализирован, пропускаем обновление статистики города');
        return;
    }

    try {
        const cityStatsRef = firestore().collection('UserCityStats').doc(`${currentUser.uid}_${city.name}`);
        const doc = await cityStatsRef.get();

        const updateData = {
            UserId: currentUser.uid,
            CityId: city.name,
            CityName: city.name,
            LastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        };

        if (doc.exists) {
            // Обновляем существующую запись
            const currentData = doc.data();
            updateData.GuessCount = (currentData.GuessCount || 0) + 1;
            updateData.CorrectCount = (currentData.CorrectCount || 0) + (isCorrect ? 1 : 0);
            updateData.IsGuessed = isCorrect ? true : (currentData.IsGuessed || false);
            updateData.IsShowed = true;
        } else {
            // Создаем новую запись
            updateData.GuessCount = 1;
            updateData.CorrectCount = isCorrect ? 1 : 0;
            updateData.IsGuessed = isCorrect;
            updateData.IsShowed = true;
            updateData.CreatedAt = firebase.firestore.FieldValue.serverTimestamp();
        }

        await cityStatsRef.set(updateData, { merge: true });
        console.log('Статистика города обновлена:', updateData);

    } catch (error) {
        console.error('Ошибка обновления статистики города:', error);
    }
}

async function getUserCityStats() {
    if (!currentUser || !firestore) return [];

    try {
        const cityStatsRef = firestore().collection('UserCityStats')
            .where('UserId', '==', currentUser.uid);
        const snapshot = await cityStatsRef.get();

        const stats = [];
        snapshot.forEach(doc => {
            stats.push(doc.data());
        });

        return stats;
    } catch (error) {
        console.error('Ошибка получения статистики городов:', error);
        return [];
    }
}
    // Запуск при готовности
    ymaps.ready(initializeGame);

async function showCityStatsModal() {
    const modal = document.getElementById('cityStatsModal');
    const loadingText = '<div class="loading">Загрузка статистики...</div>';
    document.getElementById('cityStatsList').innerHTML = loadingText;

    modal.style.display = 'flex';

    // Загружаем статистику
    allCityStats = await getUserCityStats();

    // Если нет данных из Firebase, используем локальную статистику
    if (allCityStats.length === 0) {
        const localStats = getGameStats();
        if (localStats.seenCities) {
            allCityStats = Object.values(localStats.seenCities).map(city => ({
                CityId: city.name,
                CityName: city.name,
                GuessCount: city.timesSeen || 0,
                CorrectCount: localStats.guessedCities && localStats.guessedCities[city.name] ? 1 : 0,
                IsGuessed: !!(localStats.guessedCities && localStats.guessedCities[city.name]),
                IsShowed: true
            }));
        }
    }

    filteredCityStats = [...allCityStats];

    // Устанавливаем активный фильтр
    setActiveFilter('showAllCities');
    renderCityStats();
}

function renderCityStats() {
    const container = document.getElementById('cityStatsList');

    if (!container) {
        console.error('Контейнер cityStatsList не найден');
        return;
    }

    if (!filteredCityStats || filteredCityStats.length === 0) {
        container.innerHTML = '<div class="no-stats">Нет данных о городах</div>';
        return;
    }

    // Сортируем по названию города
    filteredCityStats.sort((a, b) => a.CityName.localeCompare(b.CityName));

    const isMobile = window.innerWidth <= 768;

    const html = `
        <div class="city-stats-table">
            ${!isMobile ? `
            <div class="table-header">
                <div class="table-cell">Город</div>
                <div class="table-cell">Статус</div>
                <div class="table-cell">Попытки</div>
                <div class="table-cell">Правильно</div>
                <div class="table-cell">Точность</div>
            </div>
            ` : ''}

            ${filteredCityStats.map((city, index) => {
                const accuracy = city.GuessCount > 0
                    ? Math.round((city.CorrectCount / city.GuessCount) * 100)
                    : 0;

                const statusIcon = city.IsGuessed ? '✅' : '❌';
                const statusText = city.IsGuessed ? 'Отгадан' : 'Не отгадан';

                return `
                    <div class="table-row" style="animation-delay: ${index * 0.05}s">
                        <div class="table-cell city-name" ${isMobile ? 'data-label="Город"' : ''}>
                            <span class="city-icon">🏙️</span>
                            ${city.CityName}
                        </div>
                        <div class="table-cell status" ${isMobile ? 'data-label="Статус"' : ''}>
                            <span class="status-icon">${statusIcon}</span>
                            ${statusText}
                        </div>
                        <div class="table-cell attempts" ${isMobile ? 'data-label="Попытки"' : ''}>${city.GuessCount || 0}</div>
                        <div class="table-cell correct" ${isMobile ? 'data-label="Правильно"' : ''}>${city.CorrectCount || 0}</div>
                        <div class="table-cell accuracy" ${isMobile ? 'data-label="Точность"' : ''}>${accuracy}%</div>
                    </div>
                `;
            }).join('')}
        </div>
    `;

    container.innerHTML = html;
}

function showAllCities() {
    filteredCityStats = [...allCityStats];
    setActiveFilter('showAllCities');
    renderCityStats();
}

function showGuessedCities() {
    filteredCityStats = allCityStats.filter(city => city.IsGuessed);
    setActiveFilter('showGuessedCities');
    renderCityStats();
}

function showNotGuessedCities() {
    filteredCityStats = allCityStats.filter(city => !city.IsGuessed);
    setActiveFilter('showNotGuessedCities');
    renderCityStats();
}

function filterCities() {
    const searchTerm = document.getElementById('citySearch').value.toLowerCase();
    if (!searchTerm) {
        filteredCityStats = [...allCityStats];
    } else {
        filteredCityStats = allCityStats.filter(city =>
            city.CityName.toLowerCase().includes(searchTerm)
        );
    }
    renderCityStats();
}

function setActiveFilter(filterFunction) {
    // Убираем активный класс со всех кнопок
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // Добавляем активный класс к нужной кнопке
    const activeBtn = document.querySelector(`[onclick="${filterFunction}()"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }
}

 function logTableDebugInfo() {
            console.log('=== ДЕБАГ ТАБЛИЦЫ СТАТИСТИКИ ===');

            // Проверяем наличие элементов
            const cityStatsList = document.getElementById('cityStatsList');
           console.log('Элемент cityStatsList:', cityStatsList);

            // Проверяем данные статистики
            console.log('Данные cityStats:', window.cityStats);

            // Проверяем наличие данных в localStorage
            const savedStats = localStorage.getItem('cityStats');
            console.log('Данные из localStorage:', savedStats ? JSON.parse(savedStats) : 'Нет данных');

            // Проверяем функцию renderCityStatsTable
            console.log('Функция renderCityStatsTable:', typeof renderCityStatsTable);
        }

        // Вызываем при загрузке страницы
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(logTableDebugInfo, 1000);
        });

function generateQuizOptions(targetCity) {
    quizOptions = [];
    correctQuizIndex = -1;

    // Добавляем правильный ответ
    quizOptions.push(targetCity.name);

    // Добавляем 3 случайных неправильных ответа
    const wrongCities = RussianCities.filter(city =>
        city.name !== targetCity.name &&
        city.difficulty <= gameSettings.difficultyLevel
    );

    // Перемешиваем массив и берем первые 3
    const shuffledWrongCities = [...wrongCities].sort(() => Math.random() - 0.5).slice(0, 3);

    shuffledWrongCities.forEach(city => {
        quizOptions.push(city.name);
    });

    // Перемешиваем все варианты
    quizOptions = quizOptions.sort(() => Math.random() - 0.5);

    // Запоминаем индекс правильного ответа
    correctQuizIndex = quizOptions.indexOf(targetCity.name);

    console.log('Варианты викторины:', quizOptions);
    console.log('Правильный ответ индекс:', correctQuizIndex, 'город:', targetCity.name);

    // Обновляем кнопки
    updateQuizButtons();
}

// Добавьте функцию обновления кнопок викторины
function updateQuizButtons() {
    const quizButtons = document.querySelectorAll('.quiz-option');
    console.log('Найдено кнопок:', quizButtons.length);
    console.log('Варианты для отображения:', quizOptions);

    quizButtons.forEach((button, index) => {
        if (quizOptions[index]) {
            button.textContent = quizOptions[index];
            button.disabled = false;
            button.classList.remove('correct', 'incorrect');
            console.log('Кнопка', index, 'установлена:', quizOptions[index]);
        } else {
            console.warn('Нет варианта для кнопки', index);
        }
    });
}

// Добавьте функцию выбора варианта в викторине
function selectQuizOption(optionIndex) {
    const selectedCity = quizOptions[optionIndex];
    const targetCity = game.getCurrentCity();
    const isCorrect = selectedCity === targetCity.name;

    // Отключаем все кнопки после выбора
    const quizButtons = document.querySelectorAll('.quiz-option');
    quizButtons.forEach(button => {
        button.disabled = true;
    });

    // Подсвечиваем правильные/неправильные ответы
    quizButtons.forEach((button, index) => {
        if (index === correctQuizIndex) {
            button.classList.add('correct');
        } else if (index === optionIndex && !isCorrect) {
            button.classList.add('incorrect');
        }
    });

    // Обрабатываем результат
    const resultElement = document.getElementById('result');
    if (isCorrect) {
        resultElement.innerHTML = `✅ Правильно! Это ${targetCity.name}`;
        resultElement.className = 'correct'; // Зеленый цвет
        updateGameStats(true, targetCity);
        showMiniMap(targetCity);
        scheduleAutoRestart();
    } else {
        if (gameSettings.attemptsCount !== 999) {
            gameSettings.remainingAttempts--;
            updateUIFromSettings();
        }

        // Устанавливаем красный цвет для неправильного ответа
        resultElement.innerHTML = `❌ Неправильно. Это ${targetCity.name}`;
        resultElement.className = 'incorrect'; // Красный цвет
        showMiniMap(targetCity);
            scheduleAutoRestart();
//        if (gameSettings.attemptsCount !== 999 && gameSettings.remainingAttempts <= 0) {
//            resultElement.innerHTML = `Попытки закончились! Это ${targetCity.name}`;
//            updateGameStats(false, targetCity);
//            showMiniMap(targetCity);
//            scheduleAutoRestart();
//        }
    }
}