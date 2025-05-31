# Drone Simülasyonu Prototipi

Bu proje, basit bir web tabanlı drone simülasyonu içerir. Drone'nin harita üzerinde hareket etmesini, anlık veri üretmesini ve çeşitli anomali senaryolarını simüle eder.

## Özellikler

### Temel Simülasyon
- **Harita Görünümü**: Canvas tabanlı 2D harita üzerinde drone hareketi
- **Anlık Veri**: Koordinat, irtifa, hız, yön gibi gerçek zamanlı veriler
- **Veri Geçmişi**: Son 20 veri kaydının gösterimi
- **Otomatik Rota**: Drone rastgele hedeflere doğru hareket eder

### Anomali Simülasyonları
- **Rota Değişikliği**: Beklenmedik yön değişikliği
- **İrtifa Kaybı**: Ani irtifa düşüşü
- **Hız Düşüşü**: Hız azalması
- **Normal Mod**: Tüm anomalileri sıfırlama

### Veri Çıktıları
- Gerçek zamanlı koordinat bilgisi (X, Y)
- İrtifa verisi (metre)
- Hız bilgisi (km/h)
- Yön bilgisi (derece)
- Durum bilgisi (normal/anomali)
- Zaman damgası

## Kullanım

1. `index.html` dosyasını bir web tarayıcısında açın
2. "Simülasyonu Başlat" butonuna tıklayın
3. Drone otomatik olarak hareket etmeye başlar
4. Anomali butonlarını kullanarak farklı senaryoları test edin

## Dosya Yapısı

```
├── index.html      # Ana HTML dosyası
├── style.css       # CSS stilleri
├── script.js       # JavaScript simülasyon kodu
└── README.md       # Bu dosya
```

## Teknik Detaylar

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Grafik**: HTML5 Canvas API
- **Güncelleme Sıklığı**: 100ms (10 FPS)
- **Veri Formatı**: JSON

## API Simülasyonu

Proje ayrıca basit bir API simülasyonu içerir:

```javascript
// Anlık veri alma
api.getCurrentData()

// Geçmiş veri alma
api.getHistoricalData(50)

// Anomali tetikleme
api.triggerAnomaly('route')
```

## Geliştirme

Bu basit simülasyon daha sonra şu özelliklerle genişletilebilir:
- Gerçek GPS koordinatları
- 3D görünüm
- Daha karmaşık anomali senaryoları
- Veri kaydı ve analizi
- REST API entegrasyonu
- WebSocket ile gerçek zamanlı veri akışı