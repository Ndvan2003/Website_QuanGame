import './style.css';
import Map from 'ol/Map.js';
import View from 'ol/View.js';
import TileLayer from 'ol/layer/Tile.js';
import OSM from 'ol/source/OSM.js';
import { fromLonLat } from 'ol/proj.js';
import { Icon, Style } from 'ol/style.js';
import LineString from 'ol/geom/LineString.js';
import Feature from 'ol/Feature.js';
import Point from 'ol/geom/Point.js';
import { Vector as VectorSource } from 'ol/source.js';
import { Vector as VectorLayer } from 'ol/layer.js';
import Overlay from 'ol/Overlay.js';
import Text from 'ol/style/Text.js';
import Fill from 'ol/style/Fill.js';
import Stroke from 'ol/style/Stroke.js';

// popup
const container = document.getElementById('popup');
const content = document.getElementById('popup-content');
const closer = document.getElementById('popup-closer');
const overlay = new Overlay({
  element: container,
  autoPan: {
    animation: {
      duration: 250,
    },
  },
});
closer.onclick = function () {
  overlay.setPosition(undefined);
  closer.blur();
};

// bản đồ
const map = new Map({
  layers: [new TileLayer({ source: new OSM() })],
  overlays: [overlay],
  target: 'map',
  view: new View({
    center: fromLonLat([105.777, 21.077]),
    zoom: 15,
  }),
});
const vectorSource = new VectorSource();

const vectorLayer = new VectorLayer({
  source: vectorSource
});

map.addLayer(vectorLayer);

let gameStores = [];
let userLocation = null;
let routeLayer = null;

let markerLayers = [];

function clearAllMarkers() {
  markerLayers.forEach((layer) => map.removeLayer(layer));
  markerLayers = [];
}

function createMarker(store) {
  const marker = new Feature({
    geometry: new Point(fromLonLat(store.coordinates)),
    name: store.name,
    DiaChi: store.DiaChi,
    Hotline: store.Hotline,
    PhiGuiXe: store.PhiGuiXe,
    HangHoa: store.HangHoa,
    ChiPhiKhac: store.ChiPhiKhac,
    GioMoCua: store.GioMoCua,
    DanhGia: store.DanhGia,
  });
  marker.setId(store._id);
  marker.setStyle(createMarkerStyle(store.name));
  const vectorSource = new VectorSource({
    features: [marker],
  });

  const markerVectorLayer = new VectorLayer({
    source: vectorSource,
  });

  map.addLayer(markerVectorLayer);
  markerLayers.push(markerVectorLayer);
}

// Lấy danh sách quán game từ API backend
fetch('http://localhost:3000/api/gamestores')
  .then((response) => response.json())
  .then((data) => {
    gameStores = data;
    gameStores.forEach((store) => createMarker(store));
  })
  .catch((error) => console.error('Lỗi khi lấy danh sách quán game:', error));

let popupIsOpen = false;

map.on('singleclick', function (evt) {
  const coordinate = evt.coordinate;
  const feature = map.forEachFeatureAtPixel(evt.pixel, function (feature) {
    return feature;
  });
  selectedFeature = feature;

  if (popupIsOpen && feature) {
    overlay.setPosition(undefined);
    popupIsOpen = false;
    return;
  }

  if (feature) {
    const properties = feature.getProperties();
    content.innerHTML = `
      <p><strong>Tên:</strong> ${properties.name}</p>
      <p><strong>Địa chỉ:</strong> ${properties.DiaChi}</p>
      <p><strong>Hotline:</strong> ${properties.Hotline}</p>
      <p><strong>Phí gửi xe:</strong> ${properties.PhiGuiXe}</p>
      <p><strong>Hàng hóa:</strong> ${properties.HangHoa}</p>
      <p><strong>Phí giờ chơi:</strong> ${properties.ChiPhiKhac}</p>
      <p><strong>Giờ mở cửa:</strong> ${properties.GioMoCua}</p>
      <p><strong>Đánh giá:</strong> ${properties.DanhGia}</p>
    `;
    overlay.setPosition(coordinate);
    popupIsOpen = true;
  } else {
    overlay.setPosition(undefined);
    popupIsOpen = false;
  }
});

closer.onclick = function () {
  overlay.setPosition(undefined);
  closer.blur();
  popupIsOpen = false;
  return false;
};

document.getElementById('apply-filter').addEventListener('click', function () {
  const selectedRating = document.getElementById('rating-filter').value;
  const selectedPrice = document.getElementById('price-filter').value;
  filterStoresByRatingAndPrice(selectedRating, selectedPrice);
});

function searchStores(input) {
  const filteredStores = gameStores.filter((store) =>
    store.name.toLowerCase().includes(input)
  );
  if (filteredStores.length > 0) {
    clearAllMarkers();
    filteredStores.forEach((store) => createMarker(store));
  } else {
    alert('Không tìm thấy quán game nào.');
  }
}

function filterStoresByRatingAndPrice(rating, price) {
  let filteredStores = gameStores;
 if (rating !== 'all') {
  filteredStores = filteredStores.filter(
    (store) => Number(store.DanhGia) === Number(rating)
  );
}
if (price !== 'all') {
  filteredStores = filteredStores.filter(
    (store) => Number(store.ChiPhiKhac) === Number(price)
  );
}

  if (filteredStores.length > 0) {
    clearAllMarkers();
    filteredStores.forEach((store) => createMarker(store));
    const firstStore = filteredStores[0];
    const coordinates = fromLonLat(firstStore.coordinates);
    map.getView().animate({ center: coordinates, zoom: 17, duration: 1000 });
    if (userLocation) {
      drawRoute(userLocation, firstStore.coordinates);
    } else {
      alert('Vui lòng bật "Vị trí của tôi" trước khi tìm đường!');
    }
  } else {
    alert('Không tìm thấy quán game nào phù hợp với tiêu chí lọc.');
  }
}

function search() {
  const addressInput = document
    .getElementById('search-input')
    .value.toLowerCase();
  if (addressInput.length < 1) {
    alert('Vui lòng nhập ít nhất 1 ký tự.');
    return;
  }
  const matchedStore = gameStores.find(
    (store) =>
      store.name.toLowerCase().startsWith(addressInput) ||
      store.DiaChi.toLowerCase().startsWith(addressInput)
  );

  if (matchedStore) {
    clearAllMarkers();
    createMarker(matchedStore);
    const coordinates = fromLonLat(matchedStore.coordinates);
    map.getView().animate({ center: coordinates, zoom: 17, duration: 1000 });
    if (userLocation) {
      drawRoute(userLocation, matchedStore.coordinates);
    } else {
      alert('Vui lòng bật "Vị trí của tôi" trước khi tìm đường!');
    }
  } else {
    fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
        addressInput
      )}&format=json`
    )
      .then((response) => response.json())
      .then((data) => {
        if (data && data.length > 0) {
          const { lat, lon } = data[0];
          const coordinates = fromLonLat([parseFloat(lon), parseFloat(lat)]);
          map.getView().animate({
            center: coordinates,
            zoom: 20,
            duration: 1000,
          });
        } else {
          alert('Không tìm thấy địa điểm');
        }
      })
      .catch((error) => {
        console.error('Lỗi khi tìm kiếm địa điểm:', error);
        alert('Có lỗi xảy ra khi tìm kiếm địa điểm');
      });
  }
}

document.getElementById('search-btn').addEventListener('click', search);

document.getElementById('location-btn').addEventListener('click', () => {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lon = position.coords.longitude;
        const lat = position.coords.latitude;
        userLocation = [lon, lat];

        const locationFeature = new Feature({
          geometry: new Point(fromLonLat([lon, lat])),
          name: 'Vị trí của tôi',
        });

        locationFeature.setStyle(
          new Style({
            image: new Icon({
              src: 'vitri.png',
              scale: 0.1,
            }),
            text: new Text({
              text: 'Vị trí của tôi',
              offsetY: -25,
              fill: new Fill({ color: '#000' }),
              stroke: new Stroke({ color: '#fff', width: 2 }),
            }),
          })
        );

        const locationSource = new VectorSource({
          features: [locationFeature],
        });

        const locationLayer = new VectorLayer({
          source: locationSource,
        });

        map.addLayer(locationLayer);
        markerLayers.push(locationLayer);

        map.getView().animate({
          center: fromLonLat([lon, lat]),
          zoom: 17,
          duration: 1000,
        });
      },
      (error) => {
        console.error('Lỗi khi lấy vị trí: ', error);
        alert('Không thể lấy vị trí hiện tại. Vui lòng kiểm tra cài đặt!');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  } else {
    alert('Trình duyệt không hỗ trợ Geolocation.');
  }
});

function drawRoute(startCoord, endCoord) {
  if (routeLayer) {
    map.removeLayer(routeLayer);
  }

  const url = `https://router.project-osrm.org/route/v1/driving/${startCoord[0]},${startCoord[1]};${endCoord[0]},${endCoord[1]}?overview=full&geometries=geojson`;

  fetch(url)
    .then(response => response.json())
    .then(data => {
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0].geometry;
        const distance = data.routes[0].distance;
        const distanceText = (distance / 1000).toFixed(2) + " km";

        if (popupIsOpen) {
          const currentContent = content.innerHTML;
          content.innerHTML = currentContent + `<hr><p style="color:#e11d48;"><strong>Khoảng cách tới quán:</strong> ${distanceText}</p>`;
        }

        const routeFeature = new Feature({
          geometry: new LineString(route.coordinates).transform('EPSG:4326', 'EPSG:3857')
        });

        const routeSource = new VectorSource({
          features: [routeFeature]
        });

        routeLayer = new VectorLayer({
          source: routeSource,
          style: new Style({
            stroke: new Stroke({
              color: '#ff0000',
              width: 4
            }),
            text: new Text({
              text: distanceText,
              font: 'bold 14px "Segoe UI", sans-serif',
              fill: new Fill({ color: '#111827' }),
              stroke: new Stroke({ color: '#ffffff', width: 3 }),
              placement: 'line',
              overflow: true
            })
          })
        });

        map.addLayer(routeLayer);
      } else {
        alert('Không thể vẽ đường đi! Dữ liệu định tuyến không hợp lệ.');
      }
    })
    .catch(err => {
      console.error('Lỗi khi gọi API OSRM:', err);
      alert('Không thể vẽ đường đi!');
    });
}

function createMarkerStyle(name) {
  return new Style({
    image: new Icon({
      src: 'icon.png',
      scale: 0.05,
      anchor: [0.5, 1],
    }),
    text: new Text({
      text: name,
      font: '600 14px "Segoe UI", sans-serif',
      scale: 1.1,
      textAlign: 'center',
      textBaseline: 'bottom',
      offsetY: -28,
      padding: [2, 6, 2, 6],
      fill: new Fill({ color: '#111827' }),
      stroke: new Stroke({ color: '#ffffff', width: 3 }),
      overflow: true,
    }),
    backgroundFill: new Fill({ color: 'rgba(255,255,255,0.85)' }),
    backgroundStroke: new Stroke({ color: '#ccc', width: 1 }),
  });
}

const searchInput = document.getElementById('search-input');
const suggestionList = document.getElementById('suggestion-list');

searchInput.addEventListener('input', function () {
  const input = this.value.toLowerCase();
  suggestionList.innerHTML = '';

  if (input.length < 0) return;

  const matchedStores = gameStores.filter((store) =>
    store.name.toLowerCase().startsWith(input)
  );

  clearAllMarkers();

  matchedStores.forEach((store) => {
    createMarker(store);
    const li = document.createElement('li');
    li.innerHTML = `<i class="fa-solid fa-gamepad"></i> ${store.name}`;
    li.addEventListener('click', () => {
      clearAllMarkers();
      createMarker(store);
      const coords = fromLonLat(store.coordinates);
      map.getView().animate({ center: coords, zoom: 17, duration: 1000 });
      searchInput.value = store.name;
      suggestionList.innerHTML = '';
    });
    suggestionList.appendChild(li);
  });

  if (matchedStores.length > 0) {
    const coords = fromLonLat(matchedStores[0].coordinates);
    map.getView().animate({ center: coords, zoom: 16, duration: 1000 });
  }
});

function toRadians(degrees) {
  return degrees * Math.PI / 180;
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
    Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

document.getElementById('sort-by-distance').addEventListener('click', function () {
  if (!userLocation) {
    alert('Vui lòng bật "Vị trí của tôi" trước!');
    return;
  }

  if (gameStores.length === 0) {
    alert('Không có dữ liệu quán game!');
    return;
  }

  let nearestStore = null;
  let minDistance = Infinity;

  gameStores.forEach((store) => {
    const [lon2, lat2] = store.coordinates;
    const [lon1, lat1] = userLocation;
    const distance = calculateDistance(lat1, lon1, lat2, lon2);
    if (distance < minDistance) {
      minDistance = distance;
      nearestStore = store;
    }
  });

  if (nearestStore) {
    clearAllMarkers();
    createMarker(nearestStore);
    const coordinates = fromLonLat(nearestStore.coordinates);
    map.getView().animate({ center: coordinates, zoom: 17, duration: 1000 });

    drawRoute(userLocation, nearestStore.coordinates);
  }
});

// ========== THÊM / SỬA / XOÁ ========== //
const formContainer = document.getElementById('restaurant-form');
const formFields = document.getElementById('form-fields');
const saveBtn = document.getElementById('save-btn');
const formClose = document.getElementById('form-close');

let currentEditId = null;
let selectedFeature = null;

function openForm(data = null) {
  formFields.innerHTML = '';
  currentEditId = data ? data._id : null;
  document.getElementById('form-title').textContent = data ? 'Sửa nhà hàng' : 'Thêm nhà hàng';

  const fields = [
    { key: 'name', label: 'Tên nhà hàng', type: 'text' },
    { key: 'DiaChi', label: 'Địa chỉ', type: 'text' },
    { key: 'Hotline', label: 'Hotline', type: 'text' },
    { key: 'PhiGuiXe', label: 'Phí gửi xe', type: 'text' },
    { key: 'HangHoa', label: 'Hàng hoá', type: 'text' },
    { key: 'ChiPhiKhac', label: 'Phí giờ chơi (Nghìn đồng)', type: 'number' },
    { key: 'GioMoCua', label: 'Giờ mở cửa', type: 'text' },
    { key: 'DanhGia', label: 'Đánh giá (1-5)', type: 'number' },
    { key: 'coordinates', label: 'Toạ độ (kinh độ,vĩ độ)', type: 'text' },
  ];

  fields.forEach(field => {
    const label = document.createElement('label');
    label.textContent = field.label;

    const input = document.createElement('input');
    input.type = field.type;
    input.name = field.key;
    input.value = data ? (field.key === 'coordinates' ? data.coordinates.join(',') : data[field.key] || '') : '';
     // Giới hạn từ 1–5 cho đánh giá
  if (field.key === 'DanhGia') {
    input.min = 1;
    input.max = 5;
  }
    formFields.appendChild(label);
    formFields.appendChild(input);
  });

  formContainer.style.display = 'block';
}


function closeForm() {
  formContainer.style.display = 'none';
  formFields.innerHTML = '';
  currentEditId = null;
}

saveBtn.addEventListener('click', async () => {
  const inputs = formFields.querySelectorAll('input');
  const data = {};

  inputs.forEach(input => {
  if (input.name === 'coordinates') {
    data.coordinates = input.value.split(',').map(Number);
  } else {
    const val = input.value.replace(/\./g, ''); // loại bỏ dấu chấm
    data[input.name] = isNaN(val) ? val : Number(val);
  }
});

  const method = currentEditId ? 'PUT' : 'POST';
  const url = currentEditId ? `http://localhost:3000/api/gamestores/${currentEditId}` : 'http://localhost:3000/api/gamestores';

  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    alert(currentEditId ? 'Cập nhật thành công!' : 'Thêm mới thành công!');
    location.reload();
  } catch (err) {
    alert('Lỗi khi lưu dữ liệu');
    console.error(err);
  }
});

formClose.addEventListener('click', closeForm);

window.addData = () => openForm();

window.editData = () => {
  if (!selectedFeature) {
    alert('Vui lòng chọn một nhà hàng trên bản đồ để sửa.');
    return;
  }

  const id = selectedFeature.getId();
  const store = gameStores.find(s => s._id === id);
  if (!store) {
    alert('Không tìm thấy dữ liệu nhà hàng để sửa!');
    return;
  }

  openForm(store);
};


window.deleteData = async () => {
  if (!selectedFeature) {
    alert('Vui lòng chọn một nhà hàng trên bản đồ để xoá.');
    return;
  }

  const id = selectedFeature.getId();
  if (!id) {
    alert('Không thể xác định ID của nhà hàng!');
    return;
  }

  if (!confirm('Bạn có chắc chắn muốn xoá nhà hàng này?')) return;

  try {
    const res = await fetch(`http://localhost:3000/api/gamestores/${id}`, { method: 'DELETE' });
    const result = await res.json();
    alert('Đã xoá thành công!');
    location.reload();
  } catch (err) {
    alert('Xảy ra lỗi khi xoá');
    console.error(err);
  }
};





