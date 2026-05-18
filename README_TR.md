# Kurumsal İş Başvurusu Yönetim Platformu (EJAP)

İş arama ve başvuru süreçlerini otomatik iş akışı takibi, çok kiracılı (multi-tenant) veri izolasyonu ve yüksek güvenlik standartlarıyla yönetmek üzere tasarlanmış kurumsal düzeyde bir web platformudur. Yüksek performanslı ve katmanlı bir mimari üzerine inşa edilen EJAP, hız ve güvenilirlik odaklı bir başvuru takip sistemi sunar.

---

## Kurumsal Yetenekler ve Güvenlik Mimarisi

### Çok Kiracılı Veri İzolasyonu ve Güvenlik
- Durumsuz (Stateless) JWT Doğrulaması: 24 saat geçerlilik süresine sahip endüstri standardı JSON Web Token (JWT) altyapısını kullanır. Gelen tüm HTTP istekleri, Bearer yetkilendirme başlıklarını denetleyen özel Express ara katmanı (middleware) ile doğrulanır.
- Kriptografik Şifre Saklama: Kullanıcı parolaları, gökkuşağı tablolarına (rainbow tables) ve kaba kuvvet (brute-force) saldırılarına karşı tam koruma sağlayan bcryptjs algoritması ve 10 turluk tuzlama (salt) yöntemiyle geri döndürülemez biçimde saklanır.
- Kiracı Düzeyinde Veri İzolasyonu: Tüm veritabanı sorguları kesin kullanıcı kimlik sınırlarına (WHERE a.user_id = ?) tabidir. Bir kullanıcı yalnızca kendi hesabına ait başvuru kayıtlarını görüntüleyebilir, düzenleyebilir veya silebilir; yatay yetki yükseltme riskleri tamamen ortadan kaldırılmıştır.

### Rol Tabanlı Erişim Kontrolü (RBAC) ve Sistem Override
- Hiyerarşik Roller: Doğrulanmış JWT yükü (payload) içerisinde güvenli bir şekilde barındırılan user ve admin yetki seviyelerini destekler.
- Yönetimsel Geçersiz Kılma (Override) Protokolü: Sistem yöneticileri (admin), standart kullanıcı sorgu sınırlarını aşarak sistemdeki tüm kullanıcılara ait başvuru kayıtlarını denetleme ve yönetme yetkisine sahiptir.
- Gizli Güvenlik Modu (Matrix Arka Kapısı): Gelişmiş yönetimsel erişim için arayüzsüz bir arka kapı protokolü uygulanmıştır. Herhangi bir girdi alanına tıklamadan doğrudan klavyeden "switchmode" yazıldığında, sistem arayüzü anında güvenli ve neon yeşili bir Matrix yönetim terminaline dönüşür.

### Yüksek Performanslı Vanilla SPA Arayüzü
- Sıfır Bağımlılık Mimarisi: Maksimum performans, saniyenin altında açılış hızları ve minimum bellek tüketimi sağlamak amacıyla React veya Angular gibi ağır JavaScript framework'leri kullanılmadan saf (vanilla) JavaScript ile mühendislik edilmiştir.
- Asenkron DOM Motoru: Arka plandaki RESTful API ile asenkron iletişim kurmak için yerleşik fetch API kullanır. Gerçek zamanlı durum güncellemeleri ve DOM yeniden hesaplamaları, sayfa yenilenmesine gerek kalmadan anlık olarak gerçekleşir.

### Tam Katmanlı Backend Topolojisi
- Sorumlulukların Ayrılığı: Sistem; Yönlendirme (Routes) -> İstek Denetleyicileri (Controllers) -> İş Mantığı Servisleri (Services) -> Veri Erişim Modelleri (Models) şeklinde kesin hatlarla ayrıştırılmış katmanlı mimariye sahiptir.
- İzole Servis Katmanı: Yönlendirme dosyalarında veya HTTP denetleyicilerinde hiçbir iş mantığı (business logic) yer almaz. Tüm algoritmik ve kurumsal kurallar, ağ protokolünden tamamen bağımsız ve test edilebilir olan servis klasöründe barındırılır.

---

## Sistem Mimari Şeması

```text
job-tracker-project/
├── backend/
│   ├── src/
│   │   ├── routes/           # Express yönlendirmeleri & ara katman bağlantıları
│   │   ├── controllers/      # HTTP veri ayrıştırma & yanıt biçimlendirme
│   │   ├── services/         # Core iş mantığı & RBAC denetimleri
│   │   ├── middleware/       # JWT token doğrulama (authMiddleware.js)
│   │   ├── models/           # SQLite bağlantı havuzu & DDL şemaları
│   │   └── server.js         # Express sunucu başlatma
│   ├── tests/                # Jest otomatik test paketleri
│   ├── docs/
│   │   └── swagger.json      # OpenAPI 3.0 API spesifikasyonu
│   └── package.json
├── frontend/
│   ├── js/
│   │   ├── api.js            # Asenkron fetch fonksiyonları + auth başlıkları
│   │   └── app.js            # İstemci durum yönetimi, DOM mantığı ve arka kapı
│   ├── css/
│   │   └── style.css         # Responsive tasarım + Neon Matrix teması
│   └── index.html            # Single Page Application ana taşıyıcısı
├── README.md
└── README_TR.md
```

---

## Veritabanı Şeması ve DDL Spesifikasyonları

Sistem, katı dış anahtar kısıtlamaları (PRAGMA foreign_keys = ON) ile çalışan hafif ve yüksek performanslı bir SQLite motoru kullanır.

### 1. users Tablosu
Sisteme kayıtlı kullanıcıları ve sistem yöneticilerini saklar.
```sql
CREATE TABLE IF NOT EXISTS users (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT    NOT NULL UNIQUE,
  password TEXT    NOT NULL,
  role     TEXT    DEFAULT 'user' -- 'user' veya 'admin'
);
```

### 2. statuses Tablosu
Değiştirilemez iş akışı aşamalarını tanımlayan sabit arama tablosudur.
```sql
CREATE TABLE IF NOT EXISTS statuses (
  id   INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT    NOT NULL
);
```
Varsayılan kategoriler: Pending, HR Interview, Technical Interview, Offer, Rejected.

### 3. applications Tablosu
İş başvurularını temsil eden ana işlem tablosudur.
```sql
CREATE TABLE IF NOT EXISTS applications (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id          INTEGER NOT NULL,
  company_name     TEXT    NOT NULL,
  position         TEXT    NOT NULL,
  status_id        INTEGER NOT NULL,
  application_date TEXT    NOT NULL,
  notes            TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (status_id) REFERENCES statuses(id)
);
```

---

## Dağıtım ve Sistem Çalıştırma

### Sistem Gereksinimleri
- Node.js (v18.0.0 veya üzeri)
- npm paket yöneticisi

### 1. İlk Kurulum
```bash
# Proje kök dizininden backend klasörüne geçiş yapın
cd job-tracker-project/backend

# Gerekli kütüphaneleri kurun
npm install
```

### 2. Çalıştırma Ortamları
```bash
# Geliştirme modunda çalıştırma (Nodemon ile anlık yeniden yükleme)
npm run dev

# Canlı (Production) modda çalıştırma
npm start
```

Sistem ilk kez başlatıldığında; klasör yapılarını denetler, SQLite DDL şemalarını derler, sabit durum kategorilerini ekler ve varsayılan bir sistem yöneticisi (root admin) hesabı oluşturur.

- Web Arayüzü: http://localhost:3000
- OpenAPI / Swagger Dokümantasyonu: http://localhost:3000/api-docs

---

## Gizli Yönetimsel Erişim (Matrix Terminali)

Platform, standart kullanıcılardan tamamen gizlenmiş gelişmiş bir yönetim protokolü barındırır:
1. Web arayüzünü http://localhost:3000 adresinden açın (oturumun kapalı olduğundan emin olun).
2. Hiçbir form alanına veya butona tıklamadan klavyeden doğrudan şu kelimeyi yazın: switchmode
3. Arayüz anında şifreli, neon yeşili bir Matrix terminaline dönüşecektir.
4. Kök (Root) yetkili bilgileriyle giriş yapın:
   - Admin ID: admin
   - Passphrase: admin123
5. Giriş başarılı olduğunda oturumunuz admin yetkisine yükseltilir. Bu sayede platformdaki tüm kayıtlı kullanıcılara ait başvuru verilerini denetleyebilir ve tam yönetimsel kontrol sağlayabilirsiniz.

---

## Test Metodolojisi ve Kapsama

Platform, ağ yönlendirmelerinden tamamen izole edilmiş servisler katmanına odaklanan titiz bir Test Güdümlü Geliştirme (TDD) yaklaşımı ve Jest test altyapısı kullanır.

```bash
# Otomatik test paketini backend klasöründe çalıştırın
npm test
```

### Test Modülleri
- userService.test.js: Kayıt iş akışlarını, şifreleme algoritmalarını, mükerrer kullanıcı adı engellemelerini ve JWT üretimini test eder.
- applicationService.test.js: Tüm CRUD operasyonlarını, veri doğrulama kurallarını, kiracı veri izolasyonunu (Kullanıcı A'nın Kullanıcı B'nin verisine erişemediğini) ve RBAC yönetimsel erişimlerini doğrular.
- statusService.test.js: Sabit durum verilerinin veritabanından başarıyla çekildiğini denetler.

Başarı Oranı: Yazılan 42 birim (unit) testin tamamı 0 hata ile başarıyla geçmektedir.

---

## REST API Referansı ve Payload Şemaları

Tüm API uç noktaları yalnızca application/json kabul eder ve döndürür. Korunan uç noktalara yapılacak tüm isteklerde şu başlık (header) bulunmalıdır:
Authorization: Bearer <jwt_tokeniniz>

### Endpoint Matrisi

| Metod | REST Endpoint | Güvenlik | Açıklama |
|--------|---------------|----------|-------------|
| POST | /api/auth/register | Açık | Yeni bir kullanıcı hesabı oluşturur |
| POST | /api/auth/login | Açık | Kullanıcıyı doğrular ve JWT token üretir |
| GET | /api/applications | Korunmalı | Kullanıcının başvurularını listeler (filtrelemeli) |
| GET | /api/applications/:id | Korunmalı | Belirli bir başvurunun detaylarını getirir |
| POST | /api/applications | Korunmalı | Yeni bir başvuru kaydı oluşturur |
| PUT | /api/applications/:id | Korunmalı | Mevcut bir başvuru kaydını tamamen günceller |
| DELETE | /api/applications/:id | Korunmalı | Başvuru kaydını siler |
| GET | /api/statuses | Korunmalı | Veritabanındaki durum kategorilerini listeler |

### Sorgu Parametreleri (GET /api/applications)
- company_name (string): SQL tablosunda büyük/küçük harf duyarsız kısmi arama yapar (LIKE '%query%').
- status_id (integer): Belirli bir durum kimliğine (id) sahip kayıtları filtreler.

### Örnek İstek Gövdesi (POST /api/applications)
```json
{
  "company_name": "Acme Systems Inc.",
  "position": "Senior Backend Architect",
  "status_id": 2,
  "application_date": "2026-05-18",
  "notes": "Teknik mülakat başarıyla tamamlandı. Teklif aşaması bekleniyor."
}
```

### Örnek Başarılı Yanıt (201 Created)
```json
{
  "id": 1042,
  "user_id": 12,
  "company_name": "Acme Systems Inc.",
  "position": "Senior Backend Architect",
  "status_id": 2,
  "status_name": "HR Interview",
  "application_date": "2026-05-18",
  "notes": "Teknik mülakat başarıyla tamamlandı. Teklif aşaması bekleniyor.",
  "owner_name": "johndoe"
}
```

---

## Girdi Doğrulama (Validation) ve Sanitizasyon

Platform, XSS ve SQL Injection gibi güvenlik açıklarına karşı tam dayanıklılık sağlamak için çift katmanlı doğrulama kullanır:
1. İstemci (Client) Tarafı: Veriler sunucuya gönderilmeden önce gerçek zamanlı DOM doğrulamasına tabi tutulur. DOM'a yazdırılan tüm veriler escapeHTML fonksiyonu ile özel karakterlerden temizlenir.
2. Sunucu (Server) Tarafı (validateApplicationData): Gerekli metin alanlarının boş olmadığını, tarihlerin ISO formatına (YYYY-MM-DD) uyduğunu ve durum ID'lerinin veritabanındaki geçerli kayıtlarla tam olarak eşleştiğini SQL sorgusu çalıştırılmadan önce kesin olarak denetler.
