
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

    // Получение текущего города
    getCurrentCity() {
        return this.currentCity;
    }

    // Получение текущих координат
    getCurrentCoords() {
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
            zoom: 12,
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
                    duration: 1000, // Длительность анимации в ms
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

    // Показать цель
    revealTarget() {
        return {
            coords: this.currentCoords,
            city: this.currentCity
        };
    }

    // Скрыть карту
    hideMap() {
        if (this.mapContainer) {
            this.mapContainer.style.display = 'none';
        }
    }

    // Показать карту
    showMap() {
        if (this.mapContainer) {
            this.mapContainer.style.display = 'block';
        }
    }

    // Уничтожить карту
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
    
    // Получить список доступных городов
    getAvailableCities() {
        return Object.keys(window.cityHints || {});
    }
    
    // Изменить тип карты
    changeMapType(mapType) {
        if (this.map) {
            this.map.setType(mapType);
        }
    }
    
    // Установить список городов для игры
    setCities(cities) {
        this.settings.majorCitiesData = cities;
    }
}
