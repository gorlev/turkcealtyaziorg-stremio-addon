# TurkceAltyazi.org Stremio Addon

TurkceAltyazi.org üzerindeki Türkçe film ve dizi altyazılarını Stremio'ya getiren, resmî olmayan topluluk eklentisi.

## Özellikler

- Film ve dizi altyazılarını IMDb kimliğiyle arar.
- Sezon paketlerinde istenen bölümü ZIP içinden sunucu tarafında seçer.
- Altyazıları UTF-8 WebVTT olarak sunar.
- Aynı anda gelen eş istekleri birleştirerek upstream yükünü azaltır.
- Pozitif, negatif, form, ZIP ve ayıklanmış altyazı cache katmanları kullanır.
- Proxy olmadan doğrudan çalışır; gerekirse çıkış proxy'si eklenebilir.

## Gereksinimler

- Node.js 20 veya üzeri
- npm

## Yerel kurulum

```sh
git clone <repository-url>
cd turkcealtyaziorg-stremio-addon
npm install
npm start
```

Ardından aşağıdaki manifest adresini Stremio'ya ekleyin:

```text
http://127.0.0.1:3648/manifest.json
```

Landing page: `http://127.0.0.1:3648/`

## Yapılandırma

Tüm değişkenler opsiyoneldir.

| Değişken | Varsayılan | Açıklama |
| --- | --- | --- |
| `PORT` | `3648` | HTTP portu |
| `PUBLIC_URL` | İstek origin'i | Dağıtımdaki herkese açık eklenti adresi |
| `PROXY_LINK` | doğrudan bağlantı | HTTP(S) veya SOCKS çıkış proxy'sinin tam URL'si |
| `TRUST_PROXY` | `false` | Express trust proxy ayarı |
| `UPSTREAM_CONCURRENCY` | `8` | Aynı anda yapılabilecek upstream istek sayısı |
| `REQUEST_TIMEOUT_MS` | `12000` | Upstream istek zaman aşımı |
| `MAX_ARCHIVE_BYTES` | `10485760` | İndirilebilecek en büyük ZIP boyutu |

### Proxy yapılandırması

Yalnızca çıkış proxy'si kullanmak için `PROXY_LINK` yeterlidir. Kullanıcı adı ve parola gerekiyorsa aynı URL içinde verilebilir:

```sh
PROXY_LINK=http://proxy.example:8080 npm start
```

Desteklenen protokoller:

- `http://` ve `https://`
- `socks4://` ve `socks4a://`
- `socks5://` ve `socks5h://`

SOCKS5 örneği:

```sh
PROXY_LINK=socks5h://proxy.example:1080 npm start
```

`socks5h://`, DNS çözümlemesini de proxy üzerinden yaptığı için çoğu sunucu dağıtımında önerilen SOCKS5 biçimidir. Kullanıcı adı veya parola `@`, `:`, `/` gibi özel karakterler içeriyorsa URL-encode edilmelidir. Proxy tanımlanmadığında uygulama doğrudan bağlantı kurar; başka bir proxy değişkeni ya da cookie gerekmez.

`.env.example` dosyası güvenli bir şablondur. Gerçek `.env` dosyası Git ve Docker build context'i dışında tutulur.

## Dokku ile dağıtım

Kök dizindeki `Dockerfile` Dokku tarafından otomatik algılanır; `Procfile` ise çalıştırılacak `web` sürecini `npm start` olarak tanımlar. Dockerfile Node.js 22 kullanır, yalnızca production bağımlılıklarını kurar ve uygulamayı yetkisiz `node` kullanıcısıyla çalıştırır.

Örnek kurulumda `<app-name>` ve alan adını kendi değerlerinizle değiştirin:

```sh
dokku apps:create <app-name>
dokku domains:set <app-name> subtitles.example.com
dokku config:set <app-name> \
  PUBLIC_URL=https://subtitles.example.com \
  TRUST_PROXY=1
git push dokku main
```

Proxy gerekiyorsa ayrıca yalnızca şu ayarı ekleyin:

```sh
dokku config:set <app-name> PROXY_LINK=socks5h://proxy.example:1080
```

`PORT` değerini Dokku üzerinde elle ayarlamayın. Dockerfile uygulamanın varsayılan `3648` portunu expose eder; kod platform bir `PORT` değeri sağlarsa onu da otomatik kullanır. `PUBLIC_URL`, Stremio'ya verilen altyazı ve görsel URL'lerinin HTTPS alan adınızı kullanmasını garanti eder. `TRUST_PROXY=1` ise Dokku'nun ilettiği proxy başlıklarının Express tarafından doğru yorumlanmasını sağlar. `PUBLIC_URL` kesin olarak ayarlıysa URL üretimi için `TRUST_PROXY` zorunlu değildir, ancak Dokku kurulumu için önerilir.

Dağıtım sonrası kontrol:

```sh
curl https://subtitles.example.com/healthz
curl https://subtitles.example.com/manifest.json
```

## Altyazı akışı

1. Stremio `/subtitles/{type}/{id}.json` endpoint'ini çağırır.
2. Eklenti TürkceAltyazi.org'dan uygun tek-bölüm ve sezon-paketi adaylarını bulur.
3. Altyazı istendiğinde ZIP yalnızca gerektiği anda indirilir.
4. Sezon paketinde `SxxExx` veya `xxXxx` kalıbıyla doğru dosya seçilir.
5. SRT, VTT, ASS veya SSA girdisi UTF-8 WebVTT'ye dönüştürülür.

## Test

```sh
npm test
npm run check
```

Testler canlı siteye bağlı değildir; küçültülmüş HTML ve ZIP fixture'ları kullanır. Eşzamanlılık testi aynı anahtara gelen çoklu isteklerin tek upstream işleme birleştiğini doğrular.

## Sağlık kontrolü

```text
GET /healthz
```

Endpoint uygulama durumunu ve proxy modunun açık olup olmadığını döndürür; proxy adresini veya kimlik bilgilerini göstermez.

## Uyarı

Bu proje TurkceAltyazi.org veya Stremio tarafından geliştirilmemekte ve desteklenmemektedir. Kaynak sitenin kullanım şartlarına ve altyazı sahiplerinin haklarına uyulması kullanıcının sorumluluğundadır.
