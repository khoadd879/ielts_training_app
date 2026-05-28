// seed-cambridge-20-reviewed.js
// Source: https://ielts-fighter.com/reading/tu-vung-sach-cambridge-ielts-20_mt1641797955.html
// Crawled: 2026-05-21
// Total words: 567
// Note: Format có vấn đề column order (đảo ngược)

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const CAMBRIDGE_IELTS_20 = [
  {
    "word": "Từ vựng",
    "phonetic": "Phiên âm",
    "type": "Giải nghĩa",
    "meaning": "nocturnal",
    "VocabType": "NOUN"
  },
  {
    "word": "/nɒkˈtɜːnəl/",
    "phonetic": "hoạt động về đêm",
    "type": "flightless",
    "meaning": "/ˈflaɪtləs/",
    "VocabType": "NOUN"
  },
  {
    "word": "không bay được",
    "phonetic": "critically endangered",
    "type": "/ˈkrɪtɪkli ɪnˈdeɪndʒəd/",
    "meaning": "cực kỳ nguy cấp (có nguy cơ tuyệt chủng rất cao)",
    "VocabType": "NOUN"
  },
  {
    "word": "unique treasure",
    "phonetic": "/juːˈniːk ˈtreʒə/",
    "type": "“báu vật” độc đáo (giá trị đặc biệt, hiếm có)",
    "meaning": "forest-dwelling",
    "VocabType": "NOUN"
  },
  {
    "word": "/ˈfɒrɪst ˌdwelɪŋ/",
    "phonetic": "sống trong rừng",
    "type": "predominantly",
    "meaning": "/prɪˈdɒmɪnəntli/",
    "VocabType": "NOUN"
  },
  {
    "word": "chủ yếu, phần lớn là",
    "phonetic": "forward-facing",
    "type": "/ˌfɔːwədˈfeɪsɪŋ/",
    "meaning": "hướng về phía trước (vd: mắt hướng thẳng)",
    "VocabType": "NOUN"
  },
  {
    "word": "lifespan",
    "phonetic": "/ˈlaɪfspæn/",
    "type": "tuổi thọ",
    "meaning": "solitary",
    "VocabType": "NOUN"
  },
  {
    "word": "/ˈsɒlɪtəri/",
    "phonetic": "sống đơn độc, thích ở một mình",
    "type": "occupy (a home range)",
    "meaning": "/ˈɒkjʊpaɪ/",
    "VocabType": "NOUN"
  },
  {
    "word": "chiếm/ở trong (một vùng sống quen thuộc)",
    "phonetic": "home range",
    "type": "/ˌhəʊm ˈreɪndʒ/",
    "meaning": "phạm vi sinh sống thường xuyên của một cá thể",
    "VocabType": "NOUN"
  },
  {
    "word": "forage",
    "phonetic": "/ˈfɒrɪdʒ/",
    "type": "kiếm ăn (tự tìm thức ăn trong tự nhiên)",
    "meaning": "leap",
    "VocabType": "NOUN"
  },
  {
    "word": "/liːp/",
    "phonetic": "nhảy vọt",
    "type": "flap (wings)",
    "meaning": "/flæp/",
    "VocabType": "NOUN"
  },
  {
    "word": "vỗ (cánh)",
    "phonetic": "controlled descent",
    "type": "/kənˈtrəʊld dɪˈsent/",
    "meaning": "sự đáp/xuống có kiểm soát (hạ dần, không rơi tự do)",
    "VocabType": "NOUN"
  },
  {
    "word": "vegetarian",
    "phonetic": "/ˌvedʒəˈteəriən/",
    "type": "ăn chay (ăn thực vật)",
    "meaning": "diet",
    "VocabType": "NOUN"
  },
  {
    "word": "/ˈdaɪət/",
    "phonetic": "chế độ ăn/khẩu phần ăn",
    "type": "breed",
    "meaning": "/briːd/",
    "VocabType": "NOUN"
  },
  {
    "word": "sinh sản",
    "phonetic": "incubation",
    "type": "/ˌɪŋkjʊˈbeɪʃn/",
    "meaning": "quá trình ấp trứng",
    "VocabType": "NOUN"
  },
  {
    "word": "vulnerable",
    "phonetic": "/ˈvʌlnərəbl/",
    "type": "dễ bị tổn thương/dễ bị tấn công (trong tự nhiên)",
    "meaning": "predators",
    "VocabType": "NOUN"
  },
  {
    "word": "/ˈpredətəz/",
    "phonetic": "động vật săn mồi/kẻ săn mồi",
    "type": "prey",
    "meaning": "/preɪ/",
    "VocabType": "NOUN"
  },
  {
    "word": "con mồi",
    "phonetic": "settlers",
    "type": "/ˈsetləz/",
    "meaning": "người đến định cư (người di cư lập cư)",
    "VocabType": "NOUN"
  },
  {
    "word": "colonisers",
    "phonetic": "/ˈkɒlənaɪzəz/",
    "type": "thực dân/người đi xâm chiếm và lập thuộc địa",
    "meaning": "confined (to)",
    "VocabType": "NOUN"
  },
  {
    "word": "/kənˈfaɪnd/",
    "phonetic": "bị giới hạn, bị thu hẹp (chỉ còn ở một khu vực)",
    "type": "accelerated (by)",
    "meaning": "/əkˈseləreɪtɪd/",
    "VocabType": "NOUN"
  },
  {
    "word": "bị đẩy nhanh/tăng tốc (làm tình hình xấu đi nhanh hơn)",
    "phonetic": "habitat",
    "type": "/ˈhæbɪtæt/",
    "meaning": "môi trường sống/sinh cảnh",
    "VocabType": "NOUN"
  },
  {
    "word": "forest clearance",
    "phonetic": "/ˈfɒrɪst ˈklɪərəns/",
    "type": "phát quang rừng (chặt/phá rừng để lấy đất)",
    "meaning": "introduced species",
    "VocabType": "NOUN"
  },
  {
    "word": "/ˌɪntrəˈdjuːst ˈspiːʃiːz/",
    "phonetic": "loài ngoại lai được đưa vào (không bản địa)",
    "type": "depleted",
    "meaning": "/dɪˈpliːtɪd/",
    "VocabType": "NOUN"
  },
  {
    "word": "làm suy kiệt/cạn kiệt (nguồn thức ăn, tài nguyên)",
    "phonetic": "conservationist",
    "type": "/ˌkɒnsəˈveɪʃənɪst/",
    "meaning": "nhà bảo tồn/nhà hoạt động bảo tồn",
    "VocabType": "NOUN"
  },
  {
    "word": "relocate",
    "phonetic": "/ˌriːləʊˈkeɪt/",
    "type": "di dời/tái định cư (chuyển cá thể sang nơi khác)",
    "meaning": "predator-free",
    "VocabType": "NOUN"
  },
  {
    "word": "/ˈpredətə friː/",
    "phonetic": "không có kẻ săn mồi (an toàn khỏi thú săn mồi)",
    "type": "population",
    "meaning": "/ˌpɒpjʊˈleɪʃn/",
    "VocabType": "NOUN"
  },
  {
    "word": "quần thể/số lượng cá thể của loài",
    "phonetic": "captivity",
    "type": "/kæpˈtɪvəti/",
    "meaning": "tình trạng nuôi nhốt (không sống hoang dã)",
    "VocabType": "NOUN"
  },
  {
    "word": "initiative",
    "phonetic": "/ɪˈnɪʃətɪv/",
    "type": "sáng kiến/chương trình khởi xướng",
    "meaning": "foundation (of)",
    "VocabType": "NOUN"
  },
  {
    "word": "/faʊnˈdeɪʃn/",
    "phonetic": "nền tảng/cơ sở (để phát triển các bước sau)",
    "type": "subsequent",
    "meaning": "/ˈsʌbsɪkwənt/",
    "VocabType": "NOUN"
  },
  {
    "word": "sau đó, về sau",
    "phonetic": "rapid decline",
    "type": "/ˌræpɪd dɪˈklaɪn/",
    "meaning": "suy giảm nhanh chóng",
    "VocabType": "NOUN"
  },
  {
    "word": "sanctuaries",
    "phonetic": "/ˈsæŋktʃuəriz/",
    "type": "khu bảo tồn/nơi trú ẩn được bảo vệ",
    "meaning": "breeding success",
    "VocabType": "NOUN"
  },
  {
    "word": "/ˈbriːdɪŋ səkˈses/",
    "phonetic": "mức độ sinh sản thành công (đẻ–nở–sống sót)",
    "type": "major predator",
    "meaning": "/ˈmeɪdʒə ˈpredətə/",
    "VocabType": "NOUN"
  },
  {
    "word": "kẻ săn mồi chính/đáng kể",
    "phonetic": "insufficient",
    "type": "/ˌɪnsəˈfɪʃnt/",
    "meaning": "không đủ (về số lượng/mức độ)",
    "VocabType": "NOUN"
  },
  {
    "word": "survive(d)",
    "phonetic": "/səˈvaɪv/",
    "type": "sống sót",
    "meaning": "offset (mortality)",
    "VocabType": "NOUN"
  },
  {
    "word": "/ˈɒfset/",
    "phonetic": "bù lại/đắp lại (vd: đủ con non để bù số chết)",
    "type": "adult mortality",
    "meaning": "/ˈædʌlt mɔːˈtæləti/",
    "VocabType": "NOUN"
  },
  {
    "word": "tỷ lệ/số lượng con trưởng thành chết",
    "phonetic": "urgent review",
    "type": "/ˈɜːdʒənt rɪˈvjuː/",
    "meaning": "rà soát/đánh giá khẩn cấp",
    "VocabType": "NOUN"
  },
  {
    "word": "Recovery Plan",
    "phonetic": "/rɪˈkʌvəri plæn/",
    "type": "kế hoạch phục hồi (bảo tồn và tăng số lượng loài)",
    "meaning": "specialist advisory group",
    "VocabType": "NOUN"
  },
  {
    "word": "/ˈspeʃəlɪst ədˈvaɪzəri ɡruːp/",
    "phonetic": "nhóm cố vấn chuyên môn",
    "type": "committee",
    "meaning": "/kəˈmɪti/",
    "VocabType": "NOUN"
  },
  {
    "word": "ủy ban/ban chuyên trách",
    "phonetic": "funding",
    "type": "/ˈfʌndɪŋ/",
    "meaning": "nguồn tài trợ/kinh phí",
    "VocabType": "NOUN"
  },
  {
    "word": "renewed steps",
    "phonetic": "/rɪˈnjuːd steps/",
    "type": "các bước/biện pháp được triển khai lại một cách mạnh mẽ (tăng cường)",
    "meaning": "eradicate(d)",
    "VocabType": "NOUN"
  },
  {
    "word": "/ɪˈrædɪkeɪt/",
    "phonetic": "diệt trừ hoàn toàn (loài xâm lấn/kẻ săn mồi)",
    "type": "intensively managed",
    "meaning": "/ɪnˈtensɪvli ˈmænɪdʒd/",
    "VocabType": "NOUN"
  },
  {
    "word": "được quản lý can thiệp sâu/sát sao",
    "phonetic": "supplementary feeding",
    "type": "/ˌsʌplɪˈmentri ˈfiːdɪŋ/",
    "meaning": "cho ăn bổ sung (ngoài thức ăn tự nhiên)",
    "VocabType": "NOUN"
  },
  {
    "word": "rescuing",
    "phonetic": "/ˈreskjuːɪŋ/",
    "type": "cứu hộ/giải cứu",
    "meaning": "hand-raising",
    "VocabType": "NOUN"
  },
  {
    "word": "/ˈhænd ˌreɪzɪŋ/",
    "phonetic": "nuôi bằng tay/nuôi chăm thủ công (thường là con non yếu)",
    "type": "cautious optimism",
    "meaning": "/ˌkɔːʃəs ˈɒptɪmɪzəm/",
    "VocabType": "NOUN"
  },
  {
    "word": "lạc quan thận trọng (hy vọng nhưng vẫn dè chừng)",
    "phonetic": "genetic diversity",
    "type": "/dʒəˈnetɪk daɪˈvɜːsəti/",
    "meaning": "đa dạng di truyền",
    "VocabType": "NOUN"
  },
  {
    "word": "stakeholders",
    "phonetic": "/ˈsteɪkˌhəʊldəz/",
    "type": "các bên liên quan (cộng đồng, tổ chức, chính phủ, nhà tài trợ…)",
    "meaning": "Từ vựng",
    "VocabType": "NOUN"
  },
  {
    "word": "Phiên âm",
    "phonetic": "Giải nghĩa",
    "type": "investigate",
    "meaning": "/ɪnˈvestɪɡeɪt/",
    "VocabType": "NOUN"
  },
  {
    "word": "điều tra/tìm hiểu kỹ (một vấn đề)",
    "phonetic": "attempts",
    "type": "/əˈtempts/",
    "meaning": "nỗ lực/cố gắng (để làm gì)",
    "VocabType": "NOUN"
  },
  {
    "word": "reintroduce",
    "phonetic": "/ˌriːˌɪntrəˈdjuːs/",
    "type": "tái đưa trở lại (loài/cây vào môi trường)",
    "meaning": "elm (tree)",
    "VocabType": "NOUN"
  },
  {
    "word": "/elm/",
    "phonetic": "cây du",
    "type": "accounting for",
    "meaning": "/əˈkaʊntɪŋ fɔː/",
    "VocabType": "NOUN"
  },
  {
    "word": "chiếm (tỷ lệ bao nhiêu)",
    "phonetic": "in the aftermath",
    "type": "/ɪn ðiː ˈɑːftəmæθ/",
    "meaning": "trong giai đoạn hậu quả/sau khi sự việc xảy ra",
    "VocabType": "NOUN"
  },
  {
    "word": "dominant",
    "phonetic": "/ˈdɒmɪnənt/",
    "type": "chiếm ưu thế/áp đảo",
    "meaning": "landscape",
    "VocabType": "NOUN"
  },
  {
    "word": "/ˈlændskeɪp/",
    "phonetic": "cảnh quan (tự nhiên, nông thôn)",
    "type": "largely forgotten",
    "meaning": "/ˈlɑːdʒli fəˈɡɒtn/",
    "VocabType": "NOUN"
  },
  {
    "word": "gần như bị lãng quên",
    "phonetic": "countryside",
    "type": "/ˈkʌntrisaɪd/",
    "meaning": "vùng nông thôn",
    "VocabType": "NOUN"
  },
  {
    "word": "reintroduction",
    "phonetic": "/ˌriːɪntrəˈdʌkʃn/",
    "type": "việc tái đưa (loài/cây) trở lại",
    "meaning": "from a very low base",
    "VocabType": "VERB"
  },
  {
    "word": "/frɒm ə ˈveri ləʊ beɪs/",
    "phonetic": "bắt đầu từ nền tảng rất thấp (số lượng cực ít)",
    "type": "impact",
    "meaning": "/ˈɪmpækt/",
    "VocabType": "NOUN"
  },
  {
    "word": "tác động/hệ quả",
    "phonetic": "difficult to picture",
    "type": "/ˈdɪfɪkəlt tə ˈpɪktʃə/",
    "meaning": "khó hình dung",
    "VocabType": "NOUN"
  },
  {
    "word": "significant",
    "phonetic": "/sɪɡˈnɪfɪkənt/",
    "type": "đáng kể/quan trọng",
    "meaning": "fungus",
    "VocabType": "NOUN"
  },
  {
    "word": "/ˈfʌŋɡəs/",
    "phonetic": "nấm (gây bệnh)",
    "type": "block",
    "meaning": "/blɒk/",
    "VocabType": "NOUN"
  },
  {
    "word": "chặn, làm tắc",
    "phonetic": "vascular system",
    "type": "/ˈvæskjʊlə ˈsɪstəm/",
    "meaning": "hệ mạch dẫn (nước, dinh dưỡng) của cây",
    "VocabType": "NOUN"
  },
  {
    "word": "nutrient",
    "phonetic": "/ˈnjuːtriənt/",
    "type": "chất dinh dưỡng",
    "meaning": "transport (system)",
    "VocabType": "NOUN"
  },
  {
    "word": "/ˈtrænspɔːt/",
    "phonetic": "vận chuyển/dẫn truyền (trong cây)",
    "type": "branch",
    "meaning": "/brɑːntʃ/",
    "VocabType": "NOUN"
  },
  {
    "word": "cành cây",
    "phonetic": "wilt",
    "type": "/wɪlt/",
    "meaning": "héo rũ",
    "VocabType": "NOUN"
  },
  {
    "word": "epidemic",
    "phonetic": "/ˌepɪˈdemɪk/",
    "type": "dịch bệnh bùng phát trên diện rộng",
    "meaning": "gradually",
    "VocabType": "NOUN"
  },
  {
    "word": "/ˈɡrædʒuəli/",
    "phonetic": "dần dần",
    "type": "die down",
    "meaning": "/daɪ daʊn/",
    "VocabType": "NOUN"
  },
  {
    "word": "lắng xuống/giảm dần (dịch bệnh)",
    "phonetic": "triggered by",
    "type": "/ˈtrɪɡəd baɪ/",
    "meaning": "bị kích hoạt/bùng lên do",
    "VocabType": "NOUN"
  },
  {
    "word": "shipments",
    "phonetic": "/ˈʃɪpmənts/",
    "type": "các lô hàng vận chuyển",
    "meaning": "logs",
    "VocabType": "NOUN"
  },
  {
    "word": "/lɒɡz/",
    "phonetic": "khúc gỗ/gỗ tròn",
    "type": "destined for",
    "meaning": "/ˈdestɪnd fɔː/",
    "VocabType": "NOUN"
  },
  {
    "word": "được định sẵn/dành cho",
    "phonetic": "intact",
    "type": "/ɪnˈtækt/",
    "meaning": "còn nguyên vẹn",
    "VocabType": "NOUN"
  },
  {
    "word": "bark",
    "phonetic": "/bɑːk/",
    "type": "vỏ cây",
    "meaning": "elm bark beetle",
    "VocabType": "VERB"
  },
  {
    "word": "/elm bɑːk ˈbiːtl/",
    "phonetic": "bọ cánh cứng ăn vỏ cây du (tác nhân lây bệnh)",
    "type": "spread",
    "meaning": "/spred/",
    "VocabType": "NOUN"
  },
  {
    "word": "lây lan/phát tán",
    "phonetic": "deadly",
    "type": "/ˈdedli/",
    "meaning": "chết người/rất nguy hiểm",
    "VocabType": "NOUN"
  },
  {
    "word": "virulent",
    "phonetic": "/ˈvɪrʊlənt/",
    "type": "độc lực cao (gây bệnh mạnh, nghiêm trọng)",
    "meaning": "strain",
    "VocabType": "NOUN"
  },
  {
    "word": "/streɪn/",
    "phonetic": "chủng (nấm/vi khuẩn)",
    "type": "vast majority",
    "meaning": "/vɑːst məˈdʒɒrəti/",
    "VocabType": "VERB"
  },
  {
    "word": "đại đa số",
    "phonetic": "hedgerows",
    "type": "/ˈhedʒrəʊz/",
    "meaning": "hàng cây/bụi cây làm rào giữa các cánh đồng",
    "VocabType": "NOUN"
  },
  {
    "word": "targeted",
    "phonetic": "/ˈtɑːɡɪtɪd/",
    "type": "bị nhắm tới (tấn công/chọn làm mục tiêu)",
    "meaning": "reach a certain size",
    "VocabType": "NOUN"
  },
  {
    "word": "/riːtʃ ə ˈsɜːtn saɪz/",
    "phonetic": "đạt đến một kích thước nhất định",
    "type": "trunk",
    "meaning": "/trʌŋk/",
    "VocabType": "NOUN"
  },
  {
    "word": "thân cây",
    "phonetic": "diameter",
    "type": "/daɪˈæmɪtə/",
    "meaning": "đường kính",
    "VocabType": "NOUN"
  },
  {
    "word": "lay eggs",
    "phonetic": "/leɪ eɡz/",
    "type": "đẻ trứng",
    "meaning": "take hold",
    "VocabType": "NOUN"
  },
  {
    "word": "/teɪk həʊld/",
    "phonetic": "bám rễ/ăn sâu; bắt đầu “chiếm” và phát triển (bệnh/nấm)",
    "type": "mature specimens",
    "meaning": "/məˈtʃʊə ˈspesɪmənz/",
    "VocabType": "NOUN"
  },
  {
    "word": "các cá thể trưởng thành (cây trưởng thành điển hình)",
    "phonetic": "identified",
    "type": "/aɪˈdentɪfaɪd/",
    "meaning": "được xác định/phát hiện",
    "VocabType": "NOUN"
  },
  {
    "word": "mysteriously",
    "phonetic": "/mɪˈstɪəriəsli/",
    "type": "một cách bí ẩn/khó giải thích",
    "meaning": "escape (the epidemic)",
    "VocabType": "NOUN"
  },
  {
    "word": "/ɪˈskeɪp/",
    "phonetic": "thoát khỏi/không bị ảnh hưởng bởi",
    "type": "key (is to…)",
    "meaning": "/kiː/",
    "VocabType": "NOUN"
  },
  {
    "word": "chìa khóa/điểm mấu chốt (là…)",
    "phonetic": "survive(d)",
    "type": "/səˈvaɪv/",
    "meaning": "sống sót",
    "VocabType": "NOUN"
  },
  {
    "word": "stood tall",
    "phonetic": "/stʊd tɔːl/",
    "type": "vẫn vững vàng/đứng vững (ẩn dụ: không “gục”)",
    "meaning": "succumb (to)",
    "VocabType": "VERB"
  },
  {
    "word": "/səˈkʌm/",
    "phonetic": "gục ngã/không chống nổi (bệnh/áp lực)",
    "type": "nevertheless",
    "meaning": "/ˌnevəðəˈles/",
    "VocabType": "NOUN"
  },
  {
    "word": "tuy vậy/dẫu vậy",
    "phonetic": "opportunities are limited",
    "type": "/ˌɒpəˈtjuːnətiz ɑː ˈlɪmɪtɪd/",
    "meaning": "cơ hội bị hạn chế (ít lựa chọn)",
    "VocabType": "NOUN"
  },
  {
    "word": "relatively small",
    "phonetic": "/ˈrelətɪvli smɔːl/",
    "type": "tương đối ít/nhỏ",
    "meaning": "avoidance",
    "VocabType": "NOUN"
  },
  {
    "word": "/əˈvɔɪdəns/",
    "phonetic": "sự né tránh (bị lây/bị tấn công)",
    "type": "tolerance",
    "meaning": "/ˈtɒlərəns/",
    "VocabType": "NOUN"
  },
  {
    "word": "khả năng chịu đựng (bị nhiễm nhưng vẫn sống)",
    "phonetic": "resistance",
    "type": "/rɪˈzɪstəns/",
    "meaning": "khả năng kháng/đề kháng (chống lại bệnh)",
    "VocabType": "NOUN"
  },
  {
    "word": "balance (between)",
    "phonetic": "/ˈbæləns/",
    "type": "sự cân bằng/tỷ lệ giữa các yếu tố",
    "meaning": "entirely down to luck",
    "VocabType": "NOUN"
  },
  {
    "word": "/ɪnˈtaɪəli daʊn tə lʌk/",
    "phonetic": "hoàn toàn do may mắn (chứ không phải nguyên nhân rõ ràng)",
    "type": "Từ vựng",
    "meaning": "Phiên âm",
    "VocabType": "NOUN"
  },
  {
    "word": "Giải nghĩa",
    "phonetic": "stress",
    "type": "/stres/",
    "meaning": "căng thẳng",
    "VocabType": "NOUN"
  },
  {
    "word": "anxious",
    "phonetic": "/ˈæŋkʃəs/",
    "type": "lo âu",
    "meaning": "weigh up (information)",
    "VocabType": "NOUN"
  },
  {
    "word": "/weɪ ʌp/",
    "phonetic": "cân nhắc, đánh giá (thông tin)",
    "type": "under stressful conditions",
    "meaning": "/ˈʌndə ˈstresfəl kənˈdɪʃnz/",
    "VocabType": "NOUN"
  },
  {
    "word": "trong điều kiện áp lực/căng thẳng",
    "phonetic": "circumstances",
    "type": "/ˈsɜːkəmstænsɪz/",
    "meaning": "hoàn cảnh, tình huống",
    "VocabType": "NOUN"
  },
  {
    "word": "processing (information)",
    "phonetic": "/ˈprəʊsesɪŋ/",
    "type": "xử lý (thông tin)",
    "meaning": "neuroscientists",
    "VocabType": "NOUN"
  },
  {
    "word": "/ˌnjʊərəʊˈsaɪəntɪsts/",
    "phonetic": "nhà khoa học thần kinh",
    "type": "investigate",
    "meaning": "/ɪnˈvestɪɡeɪt/",
    "VocabType": "NOUN"
  },
  {
    "word": "nghiên cứu/điều tra",
    "phonetic": "operate",
    "type": "/ˈɒpəreɪt/",
    "meaning": "vận hành/hoạt động (của tâm trí)",
    "VocabType": "NOUN"
  },
  {
    "word": "vary",
    "phonetic": "/ˈveəri/",
    "type": "thay đổi, khác nhau",
    "meaning": "relaxed",
    "VocabType": "NOUN"
  },
  {
    "word": "/rɪˈlækst/",
    "phonetic": "thư giãn, thoải mái",
    "type": "hectic",
    "meaning": "/ˈhektɪk/",
    "VocabType": "NOUN"
  },
  {
    "word": "căng như dây đàn, bận rộn hỗn loạn",
    "phonetic": "numerous",
    "type": "/ˈnjuːmərəs/",
    "meaning": "nhiều (số lượng lớn)",
    "VocabType": "NOUN"
  },
  {
    "word": "life-threatening",
    "phonetic": "/ˈlaɪf ˌθretənɪŋ/",
    "type": "đe doạ tính mạng",
    "meaning": "incidents",
    "VocabType": "NOUN"
  },
  {
    "word": "/ˈɪnsɪdənts/",
    "phonetic": "sự cố/vụ việc",
    "type": "attend to",
    "meaning": "/əˈtend tuː/",
    "VocabType": "NOUN"
  },
  {
    "word": "xử lý/đến giải quyết (một vụ việc)",
    "phonetic": "rescue",
    "type": "/ˈreskjuː/",
    "meaning": "cứu hộ/cứu",
    "VocabType": "NOUN"
  },
  {
    "word": "trapped",
    "phonetic": "/træpt/",
    "type": "bị mắc kẹt",
    "meaning": "residents",
    "VocabType": "NOUN"
  },
  {
    "word": "/ˈrezɪdənts/",
    "phonetic": "cư dân/người trong nhà",
    "type": "assist",
    "meaning": "/əˈsɪst/",
    "VocabType": "NOUN"
  },
  {
    "word": "hỗ trợ",
    "phonetic": "medical emergencies",
    "type": "/ˌmedɪkl ɪˈmɜːdʒənsiz/",
    "meaning": "tình huống cấp cứu y tế",
    "VocabType": "NOUN"
  },
  {
    "word": "ups and downs",
    "phonetic": "/ˌʌps ən ˈdaʊnz/",
    "type": "thăng trầm/lúc lên lúc xuống",
    "meaning": "setting",
    "VocabType": "NOUN"
  },
  {
    "word": "/ˈsetɪŋ/",
    "phonetic": "bối cảnh/môi trường phù hợp",
    "type": "experiment",
    "meaning": "/ɪkˈsperɪmənt/",
    "VocabType": "NOUN"
  },
  {
    "word": "thí nghiệm",
    "phonetic": "under pressure",
    "type": "/ˈʌndə ˈpreʃə/",
    "meaning": "dưới áp lực",
    "VocabType": "NOUN"
  },
  {
    "word": "perceived threat",
    "phonetic": "/pəˈsiːvd θret/",
    "type": "mối đe doạ “cảm nhận được” (cảm giác bị nguy hiểm)",
    "meaning": "act as a trigger",
    "VocabType": "NOUN"
  },
  {
    "word": "/ækt əz ə ˈtrɪɡə/",
    "phonetic": "đóng vai trò “cò súng”/kích hoạt",
    "type": "stress reaction",
    "meaning": "/stres riˈækʃn/",
    "VocabType": "NOUN"
  },
  {
    "word": "phản ứng căng thẳng của cơ thể",
    "phonetic": "task",
    "type": "/tɑːsk/",
    "meaning": "nhiệm vụ",
    "VocabType": "NOUN"
  },
  {
    "word": "convey (bad news)",
    "phonetic": "/kənˈveɪ/",
    "type": "truyền tải (tin xấu)",
    "meaning": "arrive at results",
    "VocabType": "NOUN"
  },
  {
    "word": "/əˈraɪv æt rɪˈzʌlts/",
    "phonetic": "đi đến kết quả/ra kết luận",
    "type": "estimate",
    "meaning": "/ˈestɪmeɪt/",
    "VocabType": "NOUN"
  },
  {
    "word": "ước tính",
    "phonetic": "likelihood",
    "type": "/ˈlaɪklihʊd/",
    "meaning": "khả năng xảy ra",
    "VocabType": "NOUN"
  },
  {
    "word": "experience (an event)",
    "phonetic": "/ɪkˈspɪəriəns/",
    "type": "trải qua (một sự kiện)",
    "meaning": "adverse events",
    "VocabType": "NOUN"
  },
  {
    "word": "/ˈædvɜːs ɪˈvents/",
    "phonetic": "biến cố bất lợi/điều xấu",
    "type": "be involved in",
    "meaning": "/bi ɪnˈvɒlvd ɪn/",
    "VocabType": "NOUN"
  },
  {
    "word": "dính líu/vướng vào",
    "phonetic": "",
    "type": "",
    "meaning": "",
    "VocabType": "NOUN"
  },
  {
    "word": "victim",
    "phonetic": "/ˈvɪktɪm/",
    "type": "nạn nhân",
    "meaning": "card fraud",
    "VocabType": "NOUN"
  },
  {
    "word": "/kɑːd frɔːd/",
    "phonetic": "gian lận thẻ (thẻ ngân hàng)",
    "type": "provide new estimates",
    "meaning": "prəˈvaɪd njuː ˈestɪməts/",
    "VocabType": "NOUN"
  },
  {
    "word": "đưa ra ước tính mới/điều chỉnh dự đoán",
    "phonetic": "optimistic",
    "type": "/ˌɒptɪˈmɪstɪk/",
    "meaning": "lạc quan",
    "VocabType": "NOUN"
  },
  {
    "word": "ignore",
    "phonetic": "/ɪɡˈnɔː/",
    "type": "phớt lờ/bỏ qua",
    "meaning": "embrace (good news)",
    "VocabType": "NOUN"
  },
  {
    "word": "/ɪmˈbreɪs/",
    "phonetic": "đón nhận (tin tốt)",
    "type": "pattern emerged",
    "meaning": "/ˈpætən ɪˈmɜːdʒd/",
    "VocabType": "NOUN"
  },
  {
    "word": "một khuôn mẫu/xu hướng xuất hiện",
    "phonetic": "hyper-vigilant",
    "type": "/ˌhaɪpəˈvɪdʒɪlənt/",
    "meaning": "cảnh giác quá mức, “nhạy” với nguy cơ",
    "VocabType": "NOUN"
  },
  {
    "word": "alter (beliefs)",
    "phonetic": "/ˈɔːltə/",
    "type": "thay đổi/điều chỉnh (niềm tin/nhận định)",
    "meaning": "in response",
    "VocabType": "NOUN"
  },
  {
    "word": "/ɪn rɪˈspɒns/",
    "phonetic": "để phản ứng lại",
    "type": "in contrast",
    "meaning": "/ɪn ˈkɒntrɑːst/",
    "VocabType": "NOUN"
  },
  {
    "word": "trái lại",
    "phonetic": "unrelated",
    "type": "/ˌʌnrɪˈleɪtɪd/",
    "meaning": "không liên quan",
    "VocabType": "NOUN"
  },
  {
    "word": "alarming",
    "phonetic": "/əˈlɑːmɪŋ/",
    "type": "đáng báo động",
    "meaning": "cortisol levels",
    "VocabType": "NOUN"
  },
  {
    "word": "/ˈkɔːtɪsɒl ˈlevlz/",
    "phonetic": "mức cortisol (hormone stress)",
    "type": "spike",
    "meaning": "/spaɪk/",
    "VocabType": "NOUN"
  },
  {
    "word": "tăng vọt",
    "phonetic": "heart rate",
    "type": "/hɑːt reɪt/",
    "meaning": "nhịp tim",
    "VocabType": "NOUN"
  },
  {
    "word": "physiological change",
    "phonetic": "/ˌfɪziəˈlɒdʒɪkl tʃeɪndʒ/",
    "type": "thay đổi sinh lý (trong cơ thể)",
    "meaning": "take in (warnings)",
    "VocabType": "NOUN"
  },
  {
    "word": "/teɪk ɪn/",
    "phonetic": "tiếp nhận/hấp thụ (cảnh báo)",
    "type": "focus on",
    "meaning": "/ˈfəʊkəs ɒn/",
    "VocabType": "NOUN"
  },
  {
    "word": "tập trung vào",
    "phonetic": "brain imaging",
    "type": "/breɪn ˈɪmɪdʒɪŋ/",
    "meaning": "chụp/ghi hình não (fMRI, v.v.)",
    "VocabType": "NOUN"
  },
  {
    "word": "neural signal",
    "phonetic": "/ˈnjʊərəl ˈsɪɡnəl/",
    "type": "tín hiệu thần kinh",
    "meaning": "unexpected",
    "VocabType": "NOUN"
  },
  {
    "word": "/ˌʌnɪkˈspektɪd/",
    "phonetic": "bất ngờ/không lường trước",
    "type": "warning signs",
    "meaning": "/ˈwɔːnɪŋ saɪnz/",
    "VocabType": "NOUN"
  },
  {
    "word": "dấu hiệu cảnh báo",
    "phonetic": "clinical depression",
    "type": "/ˈklɪnɪkl dɪˈpreʃn/",
    "meaning": "trầm cảm lâm sàng",
    "VocabType": "NOUN"
  },
  {
    "word": "Từ vựng",
    "phonetic": "Phiên âm",
    "type": "Giải nghĩa",
    "meaning": "manatee",
    "VocabType": "NOUN"
  },
  {
    "word": "/ˈmænətiː/",
    "phonetic": "lợn biển (động vật có vú sống dưới nước)",
    "type": "sea cow",
    "meaning": "/ˈsiː kaʊ/",
    "VocabType": "NOUN"
  },
  {
    "word": "“bò biển” (tên gọi khác của manatee)",
    "phonetic": "aquatic",
    "type": "/əˈkwætɪk/",
    "meaning": "sống dưới nước/thuộc môi trường nước",
    "VocabType": "NOUN"
  },
  {
    "word": "mammal",
    "phonetic": "/ˈmæməl/",
    "type": "động vật có vú",
    "meaning": "belong to",
    "VocabType": "NOUN"
  },
  {
    "word": "/bɪˈlɒŋ tuː/",
    "phonetic": "thuộc về (một nhóm)",
    "type": "Sirenia",
    "meaning": "/saɪˈriːniə/",
    "VocabType": "NOUN"
  },
  {
    "word": "bộ Sirenia (nhóm gồm manatee, dugong)",
    "phonetic": "dugong",
    "type": "/ˈdjuːɡɒŋ/",
    "meaning": "bò biển/dugong (loài họ hàng với manatee)",
    "VocabType": "NOUN"
  },
  {
    "word": "alike",
    "phonetic": "/əˈlaɪk/",
    "type": "giống nhau",
    "meaning": "similar in size",
    "VocabType": "NOUN"
  },
  {
    "word": "/ˈsɪmɪlə ɪn saɪz/",
    "phonetic": "tương tự về kích thước",
    "type": "shape",
    "meaning": "/ʃeɪp/",
    "VocabType": "NOUN"
  },
  {
    "word": "hình dáng",
    "phonetic": "flexible",
    "type": "/ˈfleksəbl/",
    "meaning": "linh hoạt, mềm dẻo",
    "VocabType": "NOUN"
  },
  {
    "word": "flipper",
    "phonetic": "/ˈflɪpə/",
    "type": "vây chèo (chi trước dạng vây)",
    "meaning": "forelimb",
    "VocabType": "VERB"
  },
  {
    "word": "/ˈfɔːlɪm/",
    "phonetic": "chi trước (tay/chân trước)",
    "type": "broad",
    "meaning": "/brɔːd/",
    "VocabType": "NOUN"
  },
  {
    "word": "rộng",
    "phonetic": "rounded",
    "type": "/ˈraʊndɪd/",
    "meaning": "tròn, bo tròn",
    "VocabType": "NOUN"
  },
  {
    "word": "tail",
    "phonetic": "/teɪl/",
    "type": "đuôi",
    "meaning": "whereas",
    "VocabType": "NOUN"
  },
  {
    "word": "/weərˈæz/",
    "phonetic": "trong khi đó (dùng để đối chiếu)",
    "type": "fluked",
    "meaning": "/fluːkt/",
    "VocabType": "NOUN"
  },
  {
    "word": "dạng “chẻ” như vây đuôi cá voi (đuôi có thùy)",
    "phonetic": "species",
    "type": "/ˈspiːʃiːz/",
    "meaning": "loài",
    "VocabType": "NOUN"
  },
  {
    "word": "neck",
    "phonetic": "/nek/",
    "type": "cổ",
    "meaning": "bone",
    "VocabType": "NOUN"
  },
  {
    "word": "/bəʊn/",
    "phonetic": "xương",
    "type": "allow",
    "meaning": "/əˈlaʊ/",
    "VocabType": "NOUN"
  },
  {
    "word": "cho phép",
    "phonetic": "entire body",
    "type": "/ɪnˈtaɪə ˈbɒdi/",
    "meaning": "toàn bộ cơ thể",
    "VocabType": "NOUN"
  },
  {
    "word": "steer",
    "phonetic": "/stɪə/",
    "type": "điều hướng/lái",
    "meaning": "pectoral",
    "VocabType": "NOUN"
  },
  {
    "word": "/ˈpektərəl/",
    "phonetic": "thuộc ngực (vd: vây ngực)",
    "type": "back limbs",
    "meaning": "/bæk lɪmz/",
    "VocabType": "NOUN"
  },
  {
    "word": "chi sau (chân sau)",
    "phonetic": "propulsion",
    "type": "/prəˈpʌlʃn/",
    "meaning": "lực đẩy/sự đẩy tiến về phía trước",
    "VocabType": "NOUN"
  },
  {
    "word": "pelvic bones",
    "phonetic": "/ˈpelvɪk bəʊnz/",
    "type": "xương chậu",
    "meaning": "leftover",
    "VocabType": "NOUN"
  },
  {
    "word": "/ˈleftəʊvə/",
    "phonetic": "phần còn lại/dấu tích (từ quá khứ)",
    "type": "evolution",
    "meaning": "/ˌiːvəˈluːʃn/",
    "VocabType": "NOUN"
  },
  {
    "word": "tiến hoá",
    "phonetic": "four-legged",
    "type": "/ˌfɔːˈleɡd/",
    "meaning": "bốn chân",
    "VocabType": "NOUN"
  },
  {
    "word": "fully aquatic",
    "phonetic": "/ˈfʊli əˈkwætɪk/",
    "type": "hoàn toàn sống dưới nước",
    "meaning": "visual similarities",
    "VocabType": "NOUN"
  },
  {
    "word": "/ˈvɪʒuəl ˌsɪməˈlærətiz/",
    "phonetic": "điểm giống nhau về ngoại hình",
    "type": "thick",
    "meaning": "/θɪk/",
    "VocabType": "NOUN"
  },
  {
    "word": "dày",
    "phonetic": "wrinkled",
    "type": "/ˈrɪŋkld/",
    "meaning": "nhăn nheo",
    "VocabType": "NOUN"
  },
  {
    "word": "skin",
    "phonetic": "/skɪn/",
    "type": "da",
    "meaning": "hairs",
    "VocabType": "NOUN"
  },
  {
    "word": "/heəz/",
    "phonetic": "lông (sợi lông)",
    "type": "covering",
    "meaning": "/ˈkʌvərɪŋ/",
    "VocabType": "NOUN"
  },
  {
    "word": "bao phủ/phủ lên",
    "phonetic": "sense",
    "type": "/sens/",
    "meaning": "cảm nhận/nhận biết",
    "VocabType": "NOUN"
  },
  {
    "word": "vibrations",
    "phonetic": "/vaɪˈbreɪʃnz/",
    "type": "rung động",
    "meaning": "seagrass",
    "VocabType": "NOUN"
  },
  {
    "word": "/ˈsiːɡrɑːs/",
    "phonetic": "cỏ biển",
    "type": "marine plants",
    "meaning": "/məˈriːn plɑːnts/",
    "VocabType": "NOUN"
  },
  {
    "word": "thực vật biển",
    "phonetic": "make up",
    "type": "/meɪk ʌp/",
    "meaning": "cấu thành/chiếm phần lớn",
    "VocabType": "NOUN"
  },
  {
    "word": "diet",
    "phonetic": "/ˈdaɪət/",
    "type": "chế độ ăn",
    "meaning": "graze",
    "VocabType": "NOUN"
  },
  {
    "word": "/ɡreɪz/",
    "phonetic": "gặm cỏ/ăn nhẩn nha (như động vật ăn cỏ)",
    "type": "uproot",
    "meaning": "/ʌpˈruːt/",
    "VocabType": "NOUN"
  },
  {
    "word": "nhổ bật rễ (cây)",
    "phonetic": "percentage",
    "type": "/pəˈsentɪdʒ/",
    "meaning": "phần trăm",
    "VocabType": "NOUN"
  },
  {
    "word": "weight",
    "phonetic": "/weɪt/",
    "type": "cân nặng",
    "meaning": "omnivorous",
    "VocabType": "NOUN"
  },
  {
    "word": "/ɒmˈnɪvərəs/",
    "phonetic": "ăn tạp",
    "type": "mollusc",
    "meaning": "/ˈmɒləsk/",
    "VocabType": "NOUN"
  },
  {
    "word": "động vật thân mềm (ốc, sò, trai…)",
    "phonetic": "herbivore",
    "type": "/ˈhɜːbɪvɔː/",
    "meaning": "động vật ăn cỏ",
    "VocabType": "NOUN"
  },
  {
    "word": "molar",
    "phonetic": "/ˈməʊlə/",
    "type": "răng hàm",
    "meaning": "grind",
    "VocabType": "NOUN"
  },
  {
    "word": "/ɡraɪnd/",
    "phonetic": "nghiền/nghiến (thức ăn)",
    "type": "abrasive",
    "meaning": "/əˈbreɪsɪv/",
    "VocabType": "NOUN"
  },
  {
    "word": "có tính mài mòn (làm mòn răng)",
    "phonetic": "worn down",
    "type": "/wɔːn daʊn/",
    "meaning": "bị mòn dần",
    "VocabType": "NOUN"
  },
  {
    "word": "fall out",
    "phonetic": "/fɔːl aʊt/",
    "type": "rụng ra",
    "meaning": "continually",
    "VocabType": "NOUN"
  },
  {
    "word": "/kənˈtɪnjuəli/",
    "phonetic": "liên tục",
    "type": "replace",
    "meaning": "/rɪˈpleɪs/",
    "VocabType": "NOUN"
  },
  {
    "word": "thay thế",
    "phonetic": "incisor",
    "type": "/ɪnˈsaɪzə/",
    "meaning": "răng cửa",
    "VocabType": "NOUN"
  },
  {
    "word": "seafloor",
    "phonetic": "/ˈsiːflɔː/",
    "type": "đáy biển",
    "meaning": "Từ vựng",
    "VocabType": "NOUN"
  },
  {
    "word": "Phiên âm",
    "phonetic": "Giải nghĩa",
    "type": "procrastination",
    "meaning": "/prəˌkræstɪˈneɪʃn/",
    "VocabType": "NOUN"
  },
  {
    "word": "sự trì hoãn (việc cần làm)",
    "phonetic": "psychologist",
    "type": "/saɪˈkɒlədʒɪst/",
    "meaning": "nhà tâm lý học",
    "VocabType": "NOUN"
  },
  {
    "word": "put off",
    "phonetic": "/pʊt ɒf/",
    "type": "trì hoãn, để sau",
    "meaning": "habit",
    "VocabType": "NOUN"
  },
  {
    "word": "/ˈhæbɪt/",
    "phonetic": "thói quen",
    "type": "delay",
    "meaning": "/dɪˈleɪ/",
    "VocabType": "NOUN"
  },
  {
    "word": "trì hoãn/làm chậm lại",
    "phonetic": "necessary",
    "type": "/ˈnesəsəri/",
    "meaning": "cần thiết",
    "VocabType": "NOUN"
  },
  {
    "word": "urgent",
    "phonetic": "/ˈɜːdʒənt/",
    "type": "khẩn cấp",
    "meaning": "enjoyable",
    "VocabType": "NOUN"
  },
  {
    "word": "/ɪnˈdʒɔɪəbl/",
    "phonetic": "thú vị, dễ chịu",
    "type": "avoid (doing)",
    "meaning": "/əˈvɔɪd/",
    "VocabType": "NOUN"
  },
  {
    "word": "né tránh (làm gì)",
    "phonetic": "job at hand",
    "type": "/dʒɒb æt hænd/",
    "meaning": "việc ngay trước mắt/việc cần xử lý ngay",
    "VocabType": "NOUN"
  },
  {
    "word": "deep down",
    "phonetic": "/diːp daʊn/",
    "type": "sâu thẳm bên trong (thật ra thì)",
    "meaning": "get on with it",
    "VocabType": "NOUN"
  },
  {
    "word": "/ɡet ɒn wɪð ɪt/",
    "phonetic": "bắt tay làm tiếp/đi vào làm luôn",
    "type": "unfortunately",
    "meaning": "/ʌnˈfɔːtʃənətli/",
    "VocabType": "NOUN"
  },
  {
    "word": "đáng tiếc là",
    "phonetic": "berate",
    "type": "/bɪˈreɪt/",
    "meaning": "mắng mỏ/tự trách nặng nề",
    "VocabType": "NOUN"
  },
  {
    "word": "matters",
    "phonetic": "/ˈmætəz/",
    "type": "quan trọng/có ý nghĩa",
    "meaning": "waste time",
    "VocabType": "NOUN"
  },
  {
    "word": "/weɪst taɪm/",
    "phonetic": "lãng phí thời gian",
    "type": "research",
    "meaning": "/rɪˈsɜːtʃ/",
    "VocabType": "NOUN"
  },
  {
    "word": "nghiên cứu",
    "phonetic": "be linked to",
    "type": "/bi lɪŋkt tuː/",
    "meaning": "có liên quan đến",
    "VocabType": "NOUN"
  },
  {
    "word": "contrary to",
    "phonetic": "/ˈkɒntrəri tuː/",
    "type": "trái với/khác với",
    "meaning": "popular belief",
    "VocabType": "NOUN"
  },
  {
    "word": "/ˌpɒpjʊlə bɪˈliːf/",
    "phonetic": "quan niệm phổ biến",
    "type": "due to",
    "meaning": "/djuː tuː/",
    "VocabType": "NOUN"
  },
  {
    "word": "do, bởi vì",
    "phonetic": "laziness",
    "type": "/ˈleɪzinəs/",
    "meaning": "sự lười biếng",
    "VocabType": "NOUN"
  },
  {
    "word": "poor time management",
    "phonetic": "/pʊə taɪm ˈmænɪdʒmənt/",
    "type": "quản lý thời gian kém",
    "meaning": "scientific studies",
    "VocabType": "NOUN"
  },
  {
    "word": "/ˌsaɪənˈtɪfɪk ˈstʌdiz/",
    "phonetic": "các nghiên cứu khoa học",
    "type": "in fact",
    "meaning": "/ɪn fækt/",
    "VocabType": "NOUN"
  },
  {
    "word": "thực ra, trên thực tế",
    "phonetic": "mood management",
    "type": "/muːd ˈmænɪdʒmənt/",
    "meaning": "quản lý cảm xúc/tâm trạng",
    "VocabType": "NOUN"
  },
  {
    "word": "be likely to",
    "phonetic": "/bi ˈlaɪkli tuː/",
    "type": "có khả năng sẽ",
    "meaning": "complete (a task)",
    "VocabType": "NOUN"
  },
  {
    "word": "/kəmˈpliːt/",
    "phonetic": "hoàn thành",
    "type": "be keen to (do)",
    "meaning": "/bi kiːn tuː/",
    "VocabType": "NOUN"
  },
  {
    "word": "háo hức/tha thiết muốn làm",
    "phonetic": "threaten",
    "type": "/ˈθretn/",
    "meaning": "đe doạ (làm tổn hại)",
    "VocabType": "NOUN"
  },
  {
    "word": "sense of self-worth",
    "phonetic": "/sens əv self wɜːθ/",
    "type": "cảm giác giá trị bản thân",
    "meaning": "anxious",
    "VocabType": "NOUN"
  },
  {
    "word": "/ˈæŋkʃəs/",
    "phonetic": "lo lắng",
    "type": "brain imaging",
    "meaning": "/breɪn ˈɪmɪdʒɪŋ/",
    "VocabType": "NOUN"
  },
  {
    "word": "chụp/ghi hình não",
    "phonetic": "detection (of threats)",
    "type": "/dɪˈtekʃn/",
    "meaning": "sự phát hiện/nhận diện (mối đe doạ)",
    "VocabType": "NOUN"
  },
  {
    "word": "emotion regulation",
    "phonetic": "/ɪˈməʊʃn ˌreɡjʊˈleɪʃn/",
    "type": "điều chỉnh/kiểm soát cảm xúc",
    "meaning": "chronically",
    "VocabType": "NOUN"
  },
  {
    "word": "/ˈkrɒnɪkli/",
    "phonetic": "mang tính mãn tính/kéo dài, lặp đi lặp lại",
    "type": "compared to",
    "meaning": "/kəmˈpeəd tuː/",
    "VocabType": "NOUN"
  },
  {
    "word": "so với",
    "phonetic": "frequently",
    "type": "/ˈfriːkwəntli/",
    "meaning": "thường xuyên",
    "VocabType": "NOUN"
  },
  {
    "word": "emotionally loaded",
    "phonetic": "/ɪˈməʊʃnəli ˈləʊdɪd/",
    "type": "nặng cảm xúc/dễ kích hoạt cảm xúc",
    "meaning": "prime candidates",
    "VocabType": "NOUN"
  },
  {
    "word": "/praɪm ˈkændɪdɑːts/",
    "phonetic": "“ứng viên hàng đầu” (rất dễ trở thành đối tượng)",
    "type": "self-esteem",
    "meaning": "/ˌself ɪˈstiːm/",
    "VocabType": "NOUN"
  },
  {
    "word": "lòng tự trọng/tự tin vào bản thân",
    "phonetic": "perfectionists",
    "type": "/pəˈfekʃənɪsts/",
    "meaning": "người cầu toàn",
    "VocabType": "NOUN"
  },
  {
    "word": "judged harshly",
    "phonetic": "/dʒʌdʒd ˈhɑːʃli/",
    "type": "bị đánh giá khắt khe",
    "meaning": "evaluate(d)",
    "VocabType": "NOUN"
  },
  {
    "word": "/ɪˈvæljueɪt/",
    "phonetic": "đánh giá/thẩm định",
    "type": "associated with",
    "meaning": "/əˈsəʊsieɪtɪd wɪð/",
    "VocabType": "NOUN"
  },
  {
    "word": "đi kèm/liên quan với",
    "phonetic": "rewarding",
    "type": "/rɪˈwɔːdɪŋ/",
    "meaning": "tạo cảm giác “được thưởng”/dễ chịu",
    "VocabType": "NOUN"
  },
  {
    "word": "condition (someone) to",
    "phonetic": "/kənˈdɪʃn/",
    "type": "“luyện”/tạo điều kiện khiến ai đó (quen phản xạ)",
    "meaning": "mood boost",
    "VocabType": "NOUN"
  },
  {
    "word": "/muːd buːst/",
    "phonetic": "cú hích tâm trạng (đỡ khó chịu hơn)",
    "type": "in the long run",
    "meaning": "/ɪn ðə lɒŋ rʌn/",
    "VocabType": "NOUN"
  },
  {
    "word": "về lâu dài",
    "phonetic": "effective",
    "type": "/ɪˈfektɪv/",
    "meaning": "hiệu quả",
    "VocabType": "NOUN"
  },
  {
    "word": "temporary",
    "phonetic": "/ˈtemprəri/",
    "type": "tạm thời",
    "meaning": "afterwards",
    "VocabType": "NOUN"
  },
  {
    "word": "/ˈɑːftəwədz/",
    "phonetic": "sau đó",
    "type": "a sense of guilt",
    "meaning": "/sens əv ɡɪlt/",
    "VocabType": "NOUN"
  },
  {
    "word": "cảm giác tội lỗi/áy náy",
    "phonetic": "reinforce",
    "type": "/ˌriːɪnˈfɔːs/",
    "meaning": "củng cố/làm mạnh thêm (thói quen)",
    "VocabType": "NOUN"
  },
  {
    "word": "tendency",
    "phonetic": "/ˈtendənsi/",
    "type": "xu hướng",
    "meaning": "costs",
    "VocabType": "NOUN"
  },
  {
    "word": "/kɒsts/",
    "phonetic": "cái giá/tác hại",
    "type": "toll (on productivity)",
    "meaning": "/təʊl/",
    "VocabType": "NOUN"
  },
  {
    "word": "“cú đánh”/sự ảnh hưởng tiêu cực (lên năng suất)",
    "phonetic": "negatively impact",
    "type": "/ˈneɡətɪvli ɪmˈpækt/",
    "meaning": "tác động tiêu cực",
    "VocabType": "NOUN"
  },
  {
    "word": "misconduct",
    "phonetic": "/ˌmɪsˈkɒndʌkt/",
    "type": "hành vi sai phạm",
    "meaning": "plagiarism",
    "VocabType": "NOUN"
  },
  {
    "word": "/ˈpleɪdʒərɪzəm/",
    "phonetic": "đạo văn",
    "type": "fraudulent",
    "meaning": "/ˈfrɔː.dʒəl.ənt/",
    "VocabType": "NOUN"
  },
  {
    "word": "gian lận, lừa đảo",
    "phonetic": "employment stability",
    "type": "/ɪmˈplɔɪ.mənt stəˈbɪl.ə.ti/",
    "meaning": "sự ổn định việc làm",
    "VocabType": "NOUN"
  },
  {
    "word": "income",
    "phonetic": "/ˈɪŋ.kʌm/",
    "type": "thu nhập",
    "meaning": "correlate with",
    "VocabType": "NOUN"
  },
  {
    "word": "/ˈkɒr.ə.leɪt wɪð/",
    "phonetic": "tương quan với",
    "type": "well-being",
    "meaning": "/ˌwelˈbiː.ɪŋ/",
    "VocabType": "NOUN"
  },
  {
    "word": "tình trạng khỏe mạnh, hạnh phúc",
    "phonetic": "coping strategy",
    "type": "/ˈkəʊ.pɪŋ ˈstræt.ə.dʒi/",
    "meaning": "chiến lược đối phó",
    "VocabType": "NOUN"
  },
  {
    "word": "demographic",
    "phonetic": "/ˌdem.əˈɡræf.ɪk/",
    "type": "nhóm dân số",
    "meaning": "distraction",
    "VocabType": "NOUN"
  },
  {
    "word": "/dɪˈstræk.ʃn/",
    "phonetic": "sự xao lãng",
    "type": "compassion",
    "meaning": "/kəmˈpæʃn/",
    "VocabType": "NOUN"
  },
  {
    "word": "lòng trắc ẩn",
    "phonetic": "Từ vựng",
    "type": "Phiên âm",
    "meaning": "Giải nghĩa",
    "VocabType": "NOUN"
  },
  {
    "word": "invasion",
    "phonetic": "/ɪnˈveɪʒn/",
    "type": "sự “tràn vào”/xâm nhập (ẩn dụ: công nghệ vào thể thao)",
    "meaning": "robot umpire",
    "VocabType": "NOUN"
  },
  {
    "word": "/ˈrəʊbɒt ˈʌmpaɪə/",
    "phonetic": "trọng tài “robot” (hệ thống tự động thay người)",
    "type": "umpire",
    "meaning": "/ˈʌmpaɪə/",
    "VocabType": "NOUN"
  },
  {
    "word": "trọng tài (bóng chày)",
    "phonetic": "minor league",
    "type": "/ˌmaɪnə ˈliːɡ/",
    "meaning": "giải hạng dưới (không phải giải lớn)",
    "VocabType": "NOUN"
  },
  {
    "word": "Automated Ball-Strike System (ABS)",
    "phonetic": "/ˈɔːtəmeɪtɪd bɔːl straɪk ˈsɪstəm/",
    "type": "hệ thống tự động xác định bóng/strike",
    "meaning": "referred to as",
    "VocabType": "NOUN"
  },
  {
    "word": "/rɪˈfɜːd tuː æz/",
    "phonetic": "được gọi là",
    "type": "judgement",
    "meaning": "/ˈdʒʌdʒmənt/",
    "VocabType": "NOUN"
  },
  {
    "word": "sự phán đoán/nhận định",
    "phonetic": "have decisions fed to (sb)",
    "type": "/hæv dɪˈsɪʒnz fed tuː/",
    "meaning": "được “truyền” quyết định cho (qua thiết bị)",
    "VocabType": "NOUN"
  },
  {
    "word": "earpiece",
    "phonetic": "/ˈɪəpiːs/",
    "type": "tai nghe nhỏ/thiết bị nghe trong tai",
    "meaning": "connected to",
    "VocabType": "NOUN"
  },
  {
    "word": "/kəˈnektɪd tuː/",
    "phonetic": "kết nối với",
    "type": "modified",
    "meaning": "/ˈmɒdɪfaɪd/",
    "VocabType": "NOUN"
  },
  {
    "word": "được chỉnh sửa/cải biên",
    "phonetic": "missile-tracking system",
    "type": "/ˈmɪsaɪl ˈtrækɪŋ ˈsɪstəm/",
    "meaning": "hệ thống theo dõi tên lửa (công nghệ được “độ” lại)",
    "VocabType": "NOUN"
  },
  {
    "word": "contraption",
    "phonetic": "/kənˈtræpʃn/",
    "type": "đồ máy móc kỳ quặc/cồng kềnh",
    "meaning": "mounted",
    "VocabType": "NOUN"
  },
  {
    "word": "/ˈmaʊntɪd/",
    "phonetic": "được gắn/cố định lên",
    "type": "press stand",
    "meaning": "/pres stænd/",
    "VocabType": "NOUN"
  },
  {
    "word": "khu vực ghế/đài cho báo chí",
    "phonetic": "Major League Baseball (MLB)",
    "type": "/ˌmeɪdʒə liːɡ ˈbeɪsbɔːl/",
    "meaning": "giải bóng chày nhà nghề Mỹ (giải lớn)",
    "VocabType": "NOUN"
  },
  {
    "word": "commission (a system)",
    "phonetic": "/kəˈmɪʃn/",
    "type": "đặt hàng/thuê phát triển (một hệ thống)",
    "meaning": "announce the calls",
    "VocabType": "NOUN"
  },
  {
    "word": "/əˈnaʊns ðə kɔːlz/",
    "phonetic": "công bố quyết định (trọng tài)",
    "type": "pitch",
    "meaning": "/pɪtʃ/",
    "VocabType": "NOUN"
  },
  {
    "word": "cú ném bóng (bóng chày)",
    "phonetic": "recorded voice",
    "type": "/rɪˈkɔːdɪd vɔɪs/",
    "meaning": "giọng thu âm sẵn",
    "VocabType": "NOUN"
  },
  {
    "word": "judgement call",
    "phonetic": "/ˈdʒʌdʒmənt kɔːl/",
    "type": "quyết định mang tính chủ quan (dựa vào cảm nhận)",
    "meaning": "batter",
    "VocabType": "NOUN"
  },
  {
    "word": "/ˈbætə/",
    "phonetic": "người đánh bóng",
    "type": "strike zone",
    "meaning": "/ˈstraɪk zəʊn/",
    "VocabType": "NOUN"
  },
  {
    "word": "vùng strike (vùng tưởng tượng)",
    "phonetic": "imaginary zone",
    "type": "/ɪˈmædʒɪnəri zəʊn/",
    "meaning": "vùng tưởng tượng",
    "VocabType": "NOUN"
  },
  {
    "word": "stretching from…to…",
    "phonetic": "/ˈstretʃɪŋ frɒm…tuː…/",
    "type": "kéo dài từ… đến…",
    "meaning": "be considered",
    "VocabType": "NOUN"
  },
  {
    "word": "/bi kənˈsɪdəd/",
    "phonetic": "được coi là",
    "type": "heckling",
    "meaning": "/ˈheklɪŋ/",
    "VocabType": "NOUN"
  },
  {
    "word": "la ó/chế giễu, gây rối bằng lời nói",
    "phonetic": "shouted disagreement",
    "type": "/ˈʃaʊtɪd ˌdɪsəˈɡriːmənt/",
    "meaning": "La hét để phản đối",
    "VocabType": "NOUN"
  },
  {
    "word": "animating force",
    "phonetic": "/ˈænɪmeɪtɪŋ fɔːs/",
    "type": "động lực “làm trận đấu sống” (nguồn gây kịch tính), động lực làm trận đấu sống động",
    "meaning": "countless",
    "VocabType": "NOUN"
  },
  {
    "word": "/ˈkaʊntləs/",
    "phonetic": "vô số",
    "type": "argument",
    "meaning": "/ˈɑːɡjumənt/",
    "VocabType": "NOUN"
  },
  {
    "word": "cuộc tranh cãi",
    "phonetic": "boundaries",
    "type": "/ˈbaʊndəriz/",
    "meaning": "ranh giới",
    "VocabType": "NOUN"
  },
  {
    "word": "evolve",
    "phonetic": "/ɪˈvɒlv/",
    "type": "tiến hoá/thay đổi dần",
    "meaning": "in various stages",
    "VocabType": "NOUN"
  },
  {
    "word": "/ɪn ˈveəriəs steɪdʒɪz/",
    "phonetic": "qua nhiều giai đoạn",
    "type": "personal abuse",
    "meaning": "/ˈpɜːsənl əˈbjuːs/",
    "VocabType": "NOUN"
  },
  {
    "word": "xúc phạm cá nhân/chửi bới nhắm người",
    "phonetic": "a no-no",
    "type": "/ə ˈnəʊnəʊ/",
    "meaning": "điều cấm kỵ/tuyệt đối không được làm",
    "VocabType": "NOUN"
  },
  {
    "word": "season",
    "phonetic": "/ˈsiːzn/",
    "type": "mùa giải",
    "meaning": "complain",
    "VocabType": "NOUN"
  },
  {
    "word": "/kəmˈpleɪn/",
    "phonetic": "phàn nàn",
    "type": "in response",
    "meaning": "/ɪn rɪˈspɒns/",
    "VocabType": "NOUN"
  },
  {
    "word": "để đáp lại",
    "phonetic": "tweak",
    "type": "/twiːk/",
    "meaning": "chỉnh nhẹ/tinh chỉnh",
    "VocabType": "NOUN"
  },
  {
    "word": "dimensions",
    "phonetic": "/daɪˈmenʃnz/",
    "type": "kích thước/các thông số (của vùng strike)",
    "meaning": "consensus",
    "VocabType": "NOUN"
  },
  {
    "word": "/kənˈsensəs/",
    "phonetic": "sự đồng thuận chung",
    "type": "profoundly",
    "meaning": "/prəˈfaʊndli/",
    "VocabType": "NOUN"
  },
  {
    "word": "sâu sắc/ cực kỳ sâu sắc",
    "phonetic": "consistent",
    "type": "/kənˈsɪstənt/",
    "meaning": "nhất quán",
    "VocabType": "NOUN"
  },
  {
    "word": "near-perfect",
    "phonetic": "/ˌnɪə ˈpɜːfɪkt/",
    "type": "gần như hoàn hảo",
    "meaning": "precise",
    "VocabType": "NOUN"
  },
  {
    "word": "/prɪˈsaɪs/",
    "phonetic": "chính xác",
    "type": "fractions of an inch",
    "meaning": "/ˈfrækʃnz əv ən ɪntʃ/",
    "VocabType": "NOUN"
  },
  {
    "word": "phần rất nhỏ của một inch (cực nhỏ)",
    "phonetic": "reduce controversy",
    "type": "/rɪˈdjuːs ˈkɒntrəvɜːsi/",
    "meaning": "giảm tranh cãi",
    "VocabType": "NOUN"
  },
  {
    "word": "commissioner",
    "phonetic": "/kəˈmɪʃənə/",
    "type": "ủy viên/người điều hành giải đấu",
    "meaning": "worth reducing",
    "VocabType": "NOUN"
  },
  {
    "word": "/wɜːθ rɪˈdjuːsɪŋ/",
    "phonetic": "có đáng để giảm bớt không",
    "type": "unforgiving",
    "meaning": "/ˌʌnfəˈɡɪvɪŋ/",
    "VocabType": "NOUN"
  },
  {
    "word": "không “nương tay”, không khoan nhượng",
    "phonetic": "pedantic",
    "type": "/pɪˈdæntɪk/",
    "meaning": "quá câu nệ, soi tiểu tiết",
    "VocabType": "NOUN"
  },
  {
    "word": "legalistic",
    "phonetic": "/ˌliːɡəˈlɪstɪk/",
    "type": "máy móc kiểu pháp lý, bám luật từng li",
    "meaning": "reward (skill)",
    "VocabType": "NOUN"
  },
  {
    "word": "/rɪˈwɔːd/",
    "phonetic": "ghi nhận/“thưởng” (kỹ năng)",
    "type": "aim",
    "meaning": "/eɪm/",
    "VocabType": "NOUN"
  },
  {
    "word": "nhắm (mục tiêu, vị trí ném)",
    "phonetic": "dialogue",
    "type": "/ˈdaɪəlɒɡ/",
    "meaning": "sự “đối thoại”/tương tác qua lại",
    "VocabType": "NOUN"
  },
  {
    "word": "executive",
    "phonetic": "/ɪɡˈzekjʊtɪv/",
    "type": "lãnh đạo cấp điều hành",
    "meaning": "tasked with",
    "VocabType": "NOUN"
  },
  {
    "word": "/tɑːskt wɪð/",
    "phonetic": "được giao nhiệm vụ làm gì",
    "type": "terrified of",
    "meaning": "/ˈterɪfaɪd əv/",
    "VocabType": "NOUN"
  },
  {
    "word": "cực kỳ lo sợ",
    "phonetic": "younger fans",
    "type": "/ˈjʌŋɡə fænz/",
    "meaning": "người hâm mộ trẻ tuổi",
    "VocabType": "NOUN"
  },
  {
    "word": "Từ vựng",
    "phonetic": "Phiên âm",
    "type": "Giải nghĩa",
    "meaning": "perspective",
    "VocabType": "NOUN"
  },
  {
    "word": "/pəˈspektɪv/",
    "phonetic": "góc nhìn/quan điểm",
    "type": "development",
    "meaning": "/dɪˈveləpmənt/",
    "VocabType": "NOUN"
  },
  {
    "word": "sự phát triển",
    "phonetic": "frozen food industry",
    "type": "/ˌfrəʊzn fuːd ˈɪndəstri/",
    "meaning": "ngành công nghiệp thực phẩm đông lạnh",
    "VocabType": "NOUN"
  },
  {
    "word": "preserve",
    "phonetic": "/prɪˈzɜːv/",
    "type": "bảo quản (giữ không hỏng)",
    "meaning": "evidence",
    "VocabType": "NOUN"
  },
  {
    "word": "/ˈevɪdəns/",
    "phonetic": "bằng chứng",
    "type": "store (ice)",
    "meaning": "/stɔː/",
    "VocabType": "NOUN"
  },
  {
    "word": "lưu trữ (băng)",
    "phonetic": "inhabitants",
    "type": "/ɪnˈhæbɪtənts/",
    "meaning": "cư dân",
    "VocabType": "NOUN"
  },
  {
    "word": "unique means",
    "phonetic": "/juːˈniːk miːnz/",
    "type": "cách thức độc đáo",
    "meaning": "conserve",
    "VocabType": "NOUN"
  },
  {
    "word": "/kənˈsɜːv/",
    "phonetic": "giữ gìn/bảo tồn (thực phẩm)",
    "type": "consumption",
    "meaning": "/kənˈsʌmpʃn/",
    "VocabType": "NOUN"
  },
  {
    "word": "sự tiêu thụ/ăn dùng",
    "phonetic": "trample",
    "type": "/ˈtræmpl/",
    "meaning": "giẫm đạp lên",
    "VocabType": "NOUN"
  },
  {
    "word": "squeeze out",
    "phonetic": "/skwiːz aʊt/",
    "type": "vắt/ép ra (nước, độ ẩm)",
    "meaning": "moisture",
    "VocabType": "VERB"
  },
  {
    "word": "/ˈmɔɪstʃə/",
    "phonetic": "độ ẩm/nước",
    "type": "dry (in the sun)",
    "meaning": "/draɪ/",
    "VocabType": "NOUN"
  },
  {
    "word": "phơi khô",
    "phonetic": "nutritional value",
    "type": "/njuːˈtrɪʃənl ˈvæljuː/",
    "meaning": "giá trị dinh dưỡng",
    "VocabType": "NOUN"
  },
  {
    "word": "aesthetic appeal",
    "phonetic": "/iːsˈθetɪk əˈpiːl/",
    "type": "độ “đẹp mắt”/tính thẩm mỹ",
    "meaning": "natural ice",
    "VocabType": "NOUN"
  },
  {
    "word": "/ˈnætʃrəl aɪs/",
    "phonetic": "băng tự nhiên",
    "type": "refrigeration",
    "meaning": "/rɪˌfrɪdʒəˈreɪʃn/",
    "VocabType": "NOUN"
  },
  {
    "word": "làm lạnh/bảo quản lạnh",
    "phonetic": "enormous",
    "type": "/ɪˈnɔːməs/",
    "meaning": "khổng lồ",
    "VocabType": "NOUN"
  },
  {
    "word": "blocks of ice",
    "phonetic": "/blɒks əv aɪs/",
    "type": "khối băng",
    "meaning": "Arctic",
    "VocabType": "NOUN"
  },
  {
    "word": "/ˈɑːktɪk/",
    "phonetic": "Bắc Cực",
    "type": "tow",
    "meaning": "/təʊ/",
    "VocabType": "NOUN"
  },
  {
    "word": "kéo (bằng tàu)",
    "phonetic": "Atlantic",
    "type": "/ətˈlæntɪk/",
    "meaning": "Đại Tây Dương",
    "VocabType": "NOUN"
  },
  {
    "word": "purpose",
    "phonetic": "/ˈpɜːpəs/",
    "type": "mục đích",
    "meaning": "railroads",
    "VocabType": "NOUN"
  },
  {
    "word": "/ˈreɪlrəʊdz/",
    "phonetic": "đường sắt",
    "type": "insulated",
    "meaning": "/ˈɪnsjʊleɪtɪd/",
    "VocabType": "NOUN"
  },
  {
    "word": "cách nhiệt",
    "phonetic": "rail car",
    "type": "/reɪl kɑː/",
    "meaning": "toa tàu",
    "VocabType": "NOUN"
  },
  {
    "word": "mechanical ice",
    "phonetic": "/məˈkænɪkl aɪs/",
    "type": "“băng cơ học” (đá tạo bằng máy)",
    "meaning": "inventor",
    "VocabType": "NOUN"
  },
  {
    "word": "/ɪnˈventə/",
    "phonetic": "nhà phát minh",
    "type": "compressor",
    "meaning": "/kəmˈpresə/",
    "VocabType": "NOUN"
  },
  {
    "word": "máy nén",
    "phonetic": "force (a gas)",
    "type": "/fɔːs/",
    "meaning": "ép/đẩy (khí)",
    "VocabType": "NOUN"
  },
  {
    "word": "ammonia",
    "phonetic": "/əˈməʊniə/",
    "type": "amoniac",
    "meaning": "Freon",
    "VocabType": "NOUN"
  },
  {
    "word": "/ˈfriːɒn/",
    "phonetic": "Freon (chất làm lạnh)",
    "type": "condenser",
    "meaning": "/kənˈdensə/",
    "VocabType": "NOUN"
  },
  {
    "word": "bộ phận ngưng tụ/dàn ngưng",
    "phonetic": "compressed gas",
    "type": "/kəmˈprest ɡæs/",
    "meaning": "khí nén",
    "VocabType": "NOUN"
  },
  {
    "word": "give up heat",
    "phonetic": "/ɡɪv ʌp hiːt/",
    "type": "tỏa/nhả nhiệt",
    "meaning": "low-pressure",
    "VocabType": "NOUN"
  },
  {
    "word": "/ˌləʊ ˈpreʃə/",
    "phonetic": "áp suất thấp",
    "type": "evaporator coil",
    "meaning": "/ɪˈvæpəreɪtə kɔɪl/",
    "VocabType": "NOUN"
  },
  {
    "word": "ống/dàn bay hơi",
    "phonetic": "liquid",
    "type": "/ˈlɪkwɪd/",
    "meaning": "chất lỏng",
    "VocabType": "NOUN"
  },
  {
    "word": "blow (air)",
    "phonetic": "/bləʊ/",
    "type": "thổi (khí)",
    "meaning": "cools",
    "VocabType": "NOUN"
  },
  {
    "word": "/kuːlz/",
    "phonetic": "làm mát",
    "type": "insulated compartment",
    "meaning": "/ˈɪnsjʊleɪtɪd kəmˈpɑːtmənt/",
    "VocabType": "NOUN"
  },
  {
    "word": "khoang cách nhiệt",
    "phonetic": "lower (temperature)",
    "type": "/ˈləʊə/",
    "meaning": "hạ (nhiệt độ)",
    "VocabType": "NOUN"
  },
  {
    "word": "freezing point",
    "phonetic": "/ˈfriːzɪŋ pɔɪnt/",
    "type": "điểm đóng băng",
    "meaning": "initially",
    "VocabType": "NOUN"
  },
  {
    "word": "/ɪˈnɪʃəli/",
    "phonetic": "ban đầu",
    "type": "cattlemen",
    "meaning": "/ˈkætəlmən/",
    "VocabType": "NOUN"
  },
  {
    "word": "chủ trại bò/người chăn nuôi gia súc",
    "phonetic": "realise",
    "type": "/ˈrɪəlaɪz/",
    "meaning": "nhận ra",
    "VocabType": "NOUN"
  },
  {
    "word": "export",
    "phonetic": "/ɪkˈspɔːt/",
    "type": "xuất khẩu",
    "meaning": "shipment",
    "VocabType": "NOUN"
  },
  {
    "word": "/ˈʃɪpmənt/",
    "phonetic": "lô hàng",
    "type": "beef",
    "meaning": "/biːf/",
    "VocabType": "NOUN"
  },
  {
    "word": "thịt bò",
    "phonetic": "mutton",
    "type": "/ˈmʌtn/",
    "meaning": "thịt cừu",
    "VocabType": "NOUN"
  },
  {
    "word": "palatable",
    "phonetic": "/ˈpælətəbl/",
    "type": "ăn được/khá ngon miệng",
    "meaning": "deterioration",
    "VocabType": "NOUN"
  },
  {
    "word": "/dɪˌtɪəriəˈreɪʃn/",
    "phonetic": "sự xuống cấp/giảm chất lượng",
    "type": "crystals",
    "meaning": "/ˈkrɪstəlz/",
    "VocabType": "NOUN"
  },
  {
    "word": "tinh thể (đá)",
    "phonetic": "cells",
    "type": "/selz/",
    "meaning": "tế bào",
    "VocabType": "NOUN"
  },
  {
    "word": "expand",
    "phonetic": "/ɪkˈspænd/",
    "type": "nở ra/giãn ra",
    "meaning": "burst",
    "VocabType": "NOUN"
  },
  {
    "word": "/bɜːst/",
    "phonetic": "vỡ/nổ tung",
    "type": "spoil",
    "meaning": "/spɔɪl/",
    "VocabType": "NOUN"
  },
  {
    "word": "làm hỏng",
    "phonetic": "flavour",
    "type": "/ˈfleɪvə/",
    "meaning": "hương vị",
    "VocabType": "NOUN"
  },
  {
    "word": "texture",
    "phonetic": "/ˈtekstʃə/",
    "type": "kết cấu (độ dai, mềm, giòn…)",
    "meaning": "Từ vựng",
    "VocabType": "NOUN"
  },
  {
    "word": "Phiên âm",
    "phonetic": "Giải nghĩa",
    "type": "coral reef",
    "meaning": "/ˈkɒrəl riːf/",
    "VocabType": "NOUN"
  },
  {
    "word": "rạn san hô",
    "phonetic": "conservationist",
    "type": "/ˌkɒnsəˈveɪʃənɪst/",
    "meaning": "nhà bảo tồn",
    "VocabType": "NOUN"
  },
  {
    "word": "final touches",
    "phonetic": "/ˌfaɪnl ˈtʌtʃɪz/",
    "type": "những hoàn thiện cuối cùng",
    "meaning": "giant",
    "VocabType": "NOUN"
  },
  {
    "word": "/ˈdʒaɪənt",
    "phonetic": "khổng lồ",
    "type": "artificial reef",
    "meaning": "/ˌɑːtɪˈfɪʃl riːf/",
    "VocabType": "NOUN"
  },
  {
    "word": "rạn san hô nhân tạo",
    "phonetic": "assemble",
    "type": "/əˈsembl/",
    "meaning": "lắp ráp/ghép lại",
    "VocabType": "NOUN"
  },
  {
    "word": "world-renowned",
    "phonetic": "/ˌwɜːld rɪˈnaʊnd/",
    "type": "nổi tiếng toàn thế giới",
    "meaning": "spectacular",
    "VocabType": "NOUN"
  },
  {
    "word": "/spekˈtækjʊlə/",
    "phonetic": "ngoạn mục/ấn tượng",
    "type": "vivid",
    "meaning": "/ˈvɪvɪd/",
    "VocabType": "VERB"
  },
  {
    "word": "rực rỡ, sống động",
    "phonetic": "branching coral",
    "type": "/ˈbrɑːntʃɪŋ ˈkɒrəl/",
    "meaning": "san hô dạng phân nhánh",
    "VocabType": "NOUN"
  },
  {
    "word": "species",
    "phonetic": "/ˈspiːʃiːz/",
    "type": "loài",
    "meaning": "tank",
    "VocabType": "NOUN"
  },
  {
    "word": "/tæŋk/",
    "phonetic": "bể (nuôi trưng bày)",
    "type": "thrive",
    "meaning": "/θraɪv/",
    "VocabType": "NOUN"
  },
  {
    "word": "phát triển mạnh, sinh sôi tốt",
    "phonetic": "in the presence of",
    "type": "/ɪn ðə ˈprezns əv/",
    "meaning": "khi có mặt/ở môi trường có",
    "VocabType": "NOUN"
  },
  {
    "word": "gallery",
    "phonetic": "/ˈɡæləri/",
    "type": "khu trưng bày/phòng triển lãm",
    "meaning": "dedicated to",
    "VocabType": "NOUN"
  },
  {
    "word": "/ˈdedɪkeɪtɪd tuː/",
    "phonetic": "dành riêng cho",
    "type": "minuscule",
    "meaning": "/ˈmɪnɪskjuːl/",
    "VocabType": "NOUN"
  },
  {
    "word": "cực nhỏ",
    "phonetic": "invertebrate",
    "type": "/ɪnˈvɜːtɪbrət/",
    "meaning": "động vật không xương sống",
    "VocabType": "NOUN"
  },
  {
    "word": "creature",
    "phonetic": "/ˈkriːtʃə/",
    "type": "sinh vật",
    "meaning": "sustain",
    "VocabType": "NOUN"
  },
  {
    "word": "/səˈsteɪn/",
    "phonetic": "duy trì/nuôi sống",
    "type": "across the planet",
    "meaning": "/əˌkrɒs ðə ˈplænɪt/",
    "VocabType": "NOUN"
  },
  {
    "word": "trên khắp hành tinh",
    "phonetic": "window (of a tank)",
    "type": "/ˈwɪndəʊ/",
    "meaning": "ô kính/khung kính quan sát",
    "VocabType": "NOUN"
  },
  {
    "word": "form the core (of)",
    "phonetic": "/fɔːm ðə kɔː/",
    "type": "tạo thành phần lõi/trung tâm",
    "meaning": "diverse ecosystems",
    "VocabType": "NOUN"
  },
  {
    "word": "/daɪˈvɜːs ˈiːkəʊˌsɪstəmz/",
    "phonetic": "hệ sinh thái đa dạng",
    "type": "highlight",
    "meaning": "/ˈhaɪlaɪt/",
    "VocabType": "NOUN"
  },
  {
    "word": "nhấn mạnh/làm nổi bật",
    "phonetic": "research",
    "type": "/rɪˈsɜːtʃ/",
    "meaning": "nghiên cứu",
    "VocabType": "NOUN"
  },
  {
    "word": "conservation efforts",
    "phonetic": "/ˌkɒnsəˈveɪʃən ˈefəts/",
    "type": "nỗ lực bảo tồn",
    "meaning": "carry out",
    "VocabType": "NOUN"
  },
  {
    "word": "/ˈkæri aʊt/",
    "phonetic": "tiến hành/thực hiện",
    "type": "threat",
    "meaning": "/θret/",
    "VocabType": "NOUN"
  },
  {
    "word": "mối đe doạ",
    "phonetic": "global warming",
    "type": "/ˌɡləʊbl ˈwɔːmɪŋ/",
    "meaning": "nóng lên toàn cầu",
    "VocabType": "NOUN"
  },
  {
    "word": "be composed of",
    "phonetic": "/bi kəmˈpəʊzd əv/",
    "type": "được cấu thành từ",
    "meaning": "polyp",
    "VocabType": "NOUN"
  },
  {
    "word": "/ˈpɒlɪp/",
    "phonetic": "polyp (thể nhỏ của san hô)",
    "type": "tentacle",
    "meaning": "/ˈtentəkl/",
    "VocabType": "NOUN"
  },
  {
    "word": "xúc tu",
    "phonetic": "capture",
    "type": "/ˈkæptʃə/",
    "meaning": "bắt/giữ lấy (con mồi)",
    "VocabType": "NOUN"
  },
  {
    "word": "marine",
    "phonetic": "/məˈriːn/",
    "type": "thuộc biển",
    "meaning": "transparent",
    "VocabType": "NOUN"
  },
  {
    "word": "/trænsˈpærənt/",
    "phonetic": "trong suốt",
    "type": "brilliant tones",
    "meaning": "/ˈbrɪliənt təʊnz/",
    "VocabType": "NOUN"
  },
  {
    "word": "sắc màu rực rỡ",
    "phonetic": "algae",
    "type": "/ˈældʒiː/",
    "meaning": "tảo",
    "VocabType": "NOUN"
  },
  {
    "word": "in turn",
    "phonetic": "/ɪn tɜːn/",
    "type": "ngược lại/đổi lại",
    "meaning": "protection",
    "VocabType": "NOUN"
  },
  {
    "word": "/prəˈtekʃn/",
    "phonetic": "sự bảo vệ",
    "type": "photosynthesise",
    "meaning": "/ˌfəʊtəʊˈsɪnθəsaɪz/",
    "VocabType": "NOUN"
  },
  {
    "word": "quang hợp",
    "phonetic": "sun’s rays",
    "type": "/sʌnz reɪz/",
    "meaning": "tia nắng",
    "VocabType": "NOUN"
  },
  {
    "word": "nutrient",
    "phonetic": "/ˈnjuːtriənt/",
    "type": "chất dinh dưỡng",
    "meaning": "symbiotic relationship",
    "VocabType": "NOUN"
  },
  {
    "word": "/ˌsɪmbaɪˈɒtɪk rɪˈleɪʃnʃɪp/",
    "phonetic": "quan hệ cộng sinh",
    "type": "growth",
    "meaning": "/ɡrəʊθ/",
    "VocabType": "NOUN"
  },
  {
    "word": "sự phát triển",
    "phonetic": "ocean bed",
    "type": "/ˈəʊʃn bed/",
    "meaning": "đáy biển",
    "VocabType": "NOUN"
  },
  {
    "word": "provide homes for",
    "phonetic": "/prəˈvaɪd həʊmz fɔː/",
    "type": "cung cấp nơi sống cho",
    "meaning": "mollusc",
    "VocabType": "NOUN"
  },
  {
    "word": "/ˈmɒləsk/",
    "phonetic": "động vật thân mềm",
    "type": "sponge",
    "meaning": "/spʌndʒ/",
    "VocabType": "NOUN"
  },
  {
    "word": "bọt biển",
    "phonetic": "shellfish",
    "type": "/ˈʃelfɪʃ/",
    "meaning": "hải sản có vỏ (tôm cua, sò ốc…)",
    "VocabType": "NOUN"
  },
  {
    "word": "rainforests of the sea",
    "phonetic": "/ˈreɪnfɒrɪsts əv ðə siː/",
    "type": "“rừng mưa của đại dương” (là biệt danh của các rạn san hô (coral reefs)",
    "meaning": "comparison",
    "VocabType": "NOUN"
  },
  {
    "word": "/kəmˈpærɪsn/",
    "phonetic": "sự so sánh",
    "type": "dismiss (an idea)",
    "meaning": "/dɪsˈmɪs/",
    "VocabType": "NOUN"
  },
  {
    "word": "bác bỏ/không công nhận",
    "phonetic": "naturalist",
    "type": "/ˈnætʃrəlɪst/",
    "meaning": "nhà tự nhiên học",
    "VocabType": "NOUN"
  },
  {
    "word": "majestic",
    "phonetic": "/məˈdʒestɪk/",
    "type": "hùng vĩ/uy nghi",
    "meaning": "under threat",
    "VocabType": "NOUN"
  },
  {
    "word": "/ˈʌndə θret/",
    "phonetic": "đang bị đe doạ",
    "type": "thermal stress",
    "meaning": "/ˈθɜːml stres/",
    "VocabType": "NOUN"
  },
  {
    "word": "stress nhiệt (căng thẳng do nhiệt độ)",
    "phonetic": "trigger",
    "type": "/ˈtrɪɡə/",
    "meaning": "kích hoạt, gây ra",
    "VocabType": "NOUN"
  },
  {
    "word": "bleaching (event)",
    "phonetic": "/ˈbliːtʃɪŋ/",
    "type": "hiện tượng tẩy trắng (san hô mất màu)",
    "meaning": "strip (of colour)",
    "VocabType": "NOUN"
  },
  {
    "word": "/strɪp/",
    "phonetic": "tước/làm mất (màu sắc)",
    "type": "Từ vựng",
    "meaning": "Phiên âm",
    "VocabType": "NOUN"
  },
  {
    "word": "Giải nghĩa",
    "phonetic": "leader (in a field)",
    "type": "/ˈliːdə/",
    "meaning": "người dẫn đầu/chuyên gia đầu ngành",
    "VocabType": "NOUN"
  },
  {
    "word": "relationship",
    "phonetic": "/rɪˈleɪʃnʃɪp/",
    "type": "mối quan hệ",
    "meaning": "colonise",
    "VocabType": "NOUN"
  },
  {
    "word": "/ˈkɒlənaɪz/",
    "phonetic": "thuộc địa hoá/đưa người (hoặc hệ thống) đến chiếm lĩnh và sinh sống",
    "type": "solar system",
    "meaning": "/ˈsəʊlə ˈsɪstəm/",
    "VocabType": "NOUN"
  },
  {
    "word": "hệ Mặt Trời",
    "phonetic": "map (mapped)",
    "type": "/mæp/",
    "meaning": "lập bản đồ/khảo sát (địa hình, không gian)",
    "VocabType": "NOUN"
  },
  {
    "word": "robotic craft",
    "phonetic": "/rəʊˈbɒtɪk krɑːft/",
    "type": "tàu/thiết bị thăm dò robot",
    "meaning": "by the end of the century",
    "VocabType": "NOUN"
  },
  {
    "word": "/baɪ ðiː end əv ðə ˈsentʃəri/",
    "phonetic": "vào cuối thế kỷ",
    "type": "mining",
    "meaning": "/ˈmaɪnɪŋ/",
    "VocabType": "NOUN"
  },
  {
    "word": "khai thác mỏ/khai thác tài nguyên",
    "phonetic": "asteroid",
    "type": "/ˈæstərɔɪd/",
    "meaning": "tiểu hành tinh",
    "VocabType": "NOUN"
  },
  {
    "word": "enable",
    "phonetic": "/ɪˈneɪbl/",
    "type": "cho phép/tạo điều kiện",
    "meaning": "fabrication",
    "VocabType": "NOUN"
  },
  {
    "word": "/ˌfæbrɪˈkeɪʃn/",
    "phonetic": "chế tạo/sản xuất (kỹ thuật)",
    "type": "structure",
    "meaning": "/ˈstrʌktʃə/",
    "VocabType": "NOUN"
  },
  {
    "word": "cấu trúc/công trình",
    "phonetic": "raw materials",
    "type": "/rɔː məˈtɪəriəlz/",
    "meaning": "nguyên liệu thô",
    "VocabType": "NOUN"
  },
  {
    "word": "realistic",
    "phonetic": "/ˌrɪəˈlɪstɪk/",
    "type": "thực tế/khả thi",
    "meaning": "benign",
    "VocabType": "NOUN"
  },
  {
    "word": "/bɪˈnaɪn/",
    "phonetic": "lành tính/ít gây hại",
    "type": "terraforming",
    "meaning": "/ˈterəfɔːmɪŋ/",
    "VocabType": "NOUN"
  },
  {
    "word": "“cải tạo hành tinh” cho giống Trái Đất",
    "phonetic": "maintain (that)",
    "type": "/meɪnˈteɪn/",
    "meaning": "khẳng định/giữ quan điểm rằng",
    "VocabType": "NOUN"
  },
  {
    "word": "preserve",
    "phonetic": "/prɪˈzɜːv/",
    "type": "bảo tồn/giữ nguyên",
    "meaning": "status",
    "VocabType": "NOUN"
  },
  {
    "word": "/ˈsteɪtəs/",
    "phonetic": "quy chế/vị thế (được công nhận)",
    "type": "analogous (to)",
    "meaning": "/əˈnælɒɡəs/",
    "VocabType": "NOUN"
  },
  {
    "word": "tương tự (về bản chất/chức năng)",
    "phonetic": "exploit",
    "type": "/ɪkˈsplɔɪt/",
    "meaning": "khai thác/tận dụng (tài nguyên)",
    "VocabType": "NOUN"
  },
  {
    "word": "mineral resources",
    "phonetic": "/ˈmɪnərəl rɪˈzɔːsɪz/",
    "type": "tài nguyên khoáng sản",
    "meaning": "engineering",
    "VocabType": "NOUN"
  },
  {
    "word": "/ˌendʒɪˈnɪərɪŋ/",
    "phonetic": "ngành kỹ thuật",
    "type": "pressing need",
    "meaning": "/ˌpresɪŋ ˈniːd/",
    "VocabType": "NOUN"
  },
  {
    "word": "nhu cầu cấp thiết",
    "phonetic": "unless",
    "type": "/ənˈles/",
    "meaning": "trừ khi",
    "VocabType": "NOUN"
  },
  {
    "word": "inaccessible",
    "phonetic": "/ˌɪnækˈsesəbl/",
    "type": "không thể tiếp cận",
    "meaning": "gather (resources)",
    "VocabType": "NOUN"
  },
  {
    "word": "/ˈɡæðə/",
    "phonetic": "thu thập/khai thác (tài nguyên)",
    "type": "nearer to home",
    "meaning": "/ˈnɪərə tə həʊm/",
    "VocabType": "NOUN"
  },
  {
    "word": "gần hơn, ngay “sân nhà”",
    "phonetic": "robotic tools",
    "type": "/rəʊˈbɒtɪk tuːlz/",
    "meaning": "công cụ robot",
    "VocabType": "NOUN"
  },
  {
    "word": "anthropology",
    "phonetic": "/ˌænθrəˈpɒlədʒi/",
    "type": "nhân học",
    "meaning": "morally dubious",
    "VocabType": "NOUN"
  },
  {
    "word": "/ˈmɒrəli ˈdjuːbiəs/",
    "phonetic": "đáng ngờ về mặt đạo đức",
    "type": "in the spirit of",
    "meaning": "/ɪn ðə ˈspɪrɪt əv/",
    "VocabType": "NOUN"
  },
  {
    "word": "theo tinh thần (tôn trọng mục đích)",
    "phonetic": "genuine interest",
    "type": "/ˈdʒenjuɪn ˈɪntrəst/",
    "meaning": "mối quan tâm thật sự",
    "VocabType": "NOUN"
  },
  {
    "word": "the Other",
    "phonetic": "/ðiː ˈʌðə/",
    "type": "“kẻ khác/tha nhân” (nhóm/văn hoá khác mình)",
    "meaning": "impose",
    "VocabType": "NOUN"
  },
  {
    "word": "/ɪmˈpəʊz/",
    "phonetic": "áp đặt",
    "type": "particular model",
    "meaning": "/pəˈtɪkjʊlə ˈmɒdl/",
    "VocabType": "NOUN"
  },
  {
    "word": "một mô hình cụ thể",
    "phonetic": "machine intelligence",
    "type": "/məˈʃiːn ɪnˈtelɪdʒəns/",
    "meaning": "trí tuệ máy",
    "VocabType": "NOUN"
  },
  {
    "word": "outstrip",
    "phonetic": "/ˌaʊtˈstrɪp/",
    "type": "vượt xa",
    "meaning": "advanced enough",
    "VocabType": "VERB"
  },
  {
    "word": "/ədˈvɑːnst ɪˈnʌf/",
    "phonetic": "đủ tiên tiến",
    "type": "beat (humans)",
    "meaning": "/biːt/",
    "VocabType": "NOUN"
  },
  {
    "word": "đánh bại",
    "phonetic": "be limited in",
    "type": "/bi ˈlɪmɪtɪd ɪn/",
    "meaning": "bị hạn chế về",
    "VocabType": "NOUN"
  },
  {
    "word": "sense (the environment)",
    "phonetic": "/sens/",
    "type": "cảm nhận (môi trường xung quanh)",
    "meaning": "recognise",
    "VocabType": "NOUN"
  },
  {
    "word": "/ˈrekəɡnaɪz/",
    "phonetic": "nhận diện",
    "type": "chessboard",
    "meaning": "/ˈtʃesbɔːd/",
    "VocabType": "NOUN"
  },
  {
    "word": "bàn cờ vua",
    "phonetic": "as cleverly as",
    "type": "/əz ˈklevəli æz/",
    "meaning": "khéo/giỏi như",
    "VocabType": "NOUN"
  },
  {
    "word": "successor",
    "phonetic": "/səkˈsesə/",
    "type": "thế hệ sau/phiên bản kế nhiệm",
    "meaning": "relate to",
    "VocabType": "NOUN"
  },
  {
    "word": "/rɪˈleɪt tuː/",
    "phonetic": "tương tác/“liên hệ” với",
    "type": "surroundings",
    "meaning": "/səˈraʊndɪŋz/",
    "VocabType": "NOUN"
  },
  {
    "word": "môi trường xung quanh",
    "phonetic": "adeptly",
    "type": "/əˈdeptli/",
    "meaning": "thành thạo/khéo léo",
    "VocabType": "NOUN"
  },
  {
    "word": "moral questions",
    "phonetic": "/ˈmɒrəl ˈkwestʃənz/",
    "type": "câu hỏi đạo đức",
    "meaning": "feel guilty",
    "VocabType": "NOUN"
  },
  {
    "word": "/fiːl ˈɡɪlti/",
    "phonetic": "cảm thấy có lỗi",
    "type": "sophisticated",
    "meaning": "/səˈfɪstɪkeɪtɪd/",
    "VocabType": "NOUN"
  },
  {
    "word": "tinh vi/phức tạp",
    "phonetic": "fret",
    "type": "/fret/",
    "meaning": "băn khoăn/lo lắng vặt",
    "VocabType": "NOUN"
  },
  {
    "word": "underemployed",
    "phonetic": "/ˌʌndərɪmˈplɔɪd/",
    "type": "không được dùng đúng năng lực/thiếu việc",
    "meaning": "frustrated",
    "VocabType": "NOUN"
  },
  {
    "word": "/frʌˈstreɪtɪd/",
    "phonetic": "bực bội, ức chế",
    "type": "bored",
    "meaning": "/bɔːd/",
    "VocabType": "NOUN"
  },
  {
    "word": "chán",
    "phonetic": "navigate",
    "type": "/ˈnævɪɡeɪt/",
    "meaning": "định hướng/di chuyển theo lộ trình",
    "VocabType": "NOUN"
  },
  {
    "word": "far outstrip",
    "phonetic": "/fɑː aʊtˈstrɪp/",
    "type": "vượt rất xa",
    "meaning": "reliability",
    "VocabType": "VERB"
  },
  {
    "word": "/rɪˌlaɪəˈbɪləti/",
    "phonetic": "độ tin cậy",
    "type": "flexibility",
    "meaning": "/ˌfleksəˈbɪləti/",
    "VocabType": "NOUN"
  },
  {
    "word": "tính linh hoạt",
    "phonetic": "highly ambitious",
    "type": "/ˌhaɪli æmˈbɪʃəs/",
    "meaning": "cực kỳ tham vọng/khó đạt",
    "VocabType": "NOUN"
  },
  {
    "word": "intrinsic (to)",
    "phonetic": "/ɪnˈtrɪnsɪk/",
    "type": "vốn có, nội tại",
    "meaning": "stem from",
    "VocabType": "VERB"
  },
  {
    "word": "/stem frɒm/",
    "phonetic": "bắt nguồn từ",
    "type": "tendency",
    "meaning": "/ˈtendənsi/",
    "VocabType": "NOUN"
  },
  {
    "word": "xu hướng",
    "phonetic": "personify",
    "type": "/pəˈsɒnɪfaɪ/",
    "meaning": "nhân hoá (vật vô tri)",
    "VocabType": "NOUN"
  },
  {
    "word": "inanimate",
    "phonetic": "/ɪnˈænɪmət/",
    "type": "vô tri/không có sự sống",
    "meaning": "representation",
    "VocabType": "VERB"
  },
  {
    "word": "/ˌreprɪzenˈteɪʃn/",
    "phonetic": "sự mô phỏng/đại diện hình ảnh",
    "type": "autonomous",
    "meaning": "/ɔːˈtɒnəməs/",
    "VocabType": "NOUN"
  },
  {
    "word": "tự chủ/tự vận hành",
    "phonetic": "singularity",
    "type": "/ˌsɪŋɡjʊˈlærɪti/",
    "meaning": "“điểm kỳ dị” (AI vượt trội dẫn tới biến đổi lớn)",
    "VocabType": "NOUN"
  },
  {
    "word": "welfare",
    "phonetic": "/ˈwelfeə/",
    "type": "phúc lợi/lợi ích",
    "meaning": "Từ vựng",
    "VocabType": "NOUN"
  },
  {
    "word": "Phiên âm",
    "phonetic": "Giải nghĩa",
    "type": "major figure",
    "meaning": "/ˌmeɪdʒə ˈfɪɡə/",
    "VocabType": "NOUN"
  },
  {
    "word": "nhân vật lớn/điểm nhấn quan trọng (trong lĩnh vực)",
    "phonetic": "remarkably",
    "type": "/rɪˈmɑːkəbli/",
    "meaning": "đáng chú ý là",
    "VocabType": "NOUN"
  },
  {
    "word": "independent",
    "phonetic": "/ˌɪndɪˈpendənt/",
    "type": "độc lập, không bị chi phối",
    "meaning": "shifting art trends",
    "VocabType": "NOUN"
  },
  {
    "word": "/ˈʃɪftɪŋ ɑːt trendz/",
    "phonetic": "trào lưu nghệ thuật thay đổi liên tục",
    "type": "stay true to",
    "meaning": "/steɪ truː tuː/",
    "VocabType": "NOUN"
  },
  {
    "word": "trung thành với/giữ đúng với",
    "phonetic": "vision",
    "type": "/ˈvɪʒn/",
    "meaning": "tầm nhìn/quan niệm nghệ thuật",
    "VocabType": "NOUN"
  },
  {
    "word": "essential",
    "phonetic": "/ɪˈsenʃl/",
    "type": "cốt lõi, tinh yếu",
    "meaning": "abstract forms",
    "VocabType": "NOUN"
  },
  {
    "word": "/ˈæbstrækt fɔːmz/",
    "phonetic": "hình thức trừu tượng",
    "type": "exceptionally",
    "meaning": "/ɪkˈsepʃənəli/",
    "VocabType": "NOUN"
  },
  {
    "word": "đặc biệt, xuất sắc",
    "phonetic": "keen powers of observation",
    "type": "/kiːn ˈpaʊəz əv ˌɒbzəˈveɪʃn/",
    "meaning": "khả năng quan sát cực nhạy",
    "VocabType": "NOUN"
  },
  {
    "word": "finesse",
    "phonetic": "/fɪˈnes/",
    "type": "sự tinh tế/khéo léo",
    "meaning": "paintbrush",
    "VocabType": "NOUN"
  },
  {
    "word": "/ˈpeɪntbrʌʃ/",
    "phonetic": "cọ vẽ",
    "type": "record (details)",
    "meaning": "/rɪˈkɔːd/",
    "VocabType": "NOUN"
  },
  {
    "word": "ghi lại/tái hiện",
    "phonetic": "subtle nuances",
    "type": "/ˈsʌtl ˈnjuːɑːnsɪz/",
    "meaning": "sắc thái tinh vi/nhẹ nhưng khác biệt",
    "VocabType": "NOUN"
  },
  {
    "word": "enliven",
    "phonetic": "/ɪnˈlaɪvn/",
    "type": "làm sinh động, thổi hồn vào",
    "meaning": "attract a wide audience",
    "VocabType": "NOUN"
  },
  {
    "word": "/əˈtrækt ə waɪd ˈɔːdiəns/",
    "phonetic": "thu hút đông đảo công chúng",
    "type": "cattle breeders",
    "meaning": "/ˈkætl ˈbriːdəz/",
    "VocabType": "NOUN"
  },
  {
    "word": "người chăn nuôi/nhân giống gia súc",
    "phonetic": "raise (on a farm)",
    "type": "/reɪz/",
    "meaning": "nuôi lớn/nuôi dạy",
    "VocabType": "NOUN"
  },
  {
    "word": "siblings",
    "phonetic": "/ˈsɪblɪŋz/",
    "type": "anh chị em ruột",
    "meaning": "graduate",
    "VocabType": "NOUN"
  },
  {
    "word": "/ˈɡrædʒueɪt/",
    "phonetic": "tốt nghiệp",
    "type": "determine to",
    "meaning": "/dɪˈtɜːmɪn tuː/",
    "VocabType": "NOUN"
  },
  {
    "word": "quyết tâm làm gì",
    "phonetic": "make her way",
    "type": "/meɪk hɜː weɪ/",
    "meaning": "tự tạo con đường/sự nghiệp",
    "VocabType": "NOUN"
  },
  {
    "word": "techniques",
    "phonetic": "/tekˈniːks/",
    "type": "kỹ thuật",
    "meaning": "traditional painting",
    "VocabType": "NOUN"
  },
  {
    "word": "/trəˈdɪʃənl ˈpeɪntɪŋ/",
    "phonetic": "hội hoạ truyền thống",
    "type": "attend (university)",
    "meaning": "/əˈtend/",
    "VocabType": "NOUN"
  },
  {
    "word": "theo học",
    "phonetic": "training college",
    "type": "/ˈtreɪnɪŋ ˈkɒlɪdʒ/",
    "meaning": "trường sư phạm/cao đẳng đào tạo",
    "VocabType": "NOUN"
  },
  {
    "word": "elementary school",
    "phonetic": "/ˈelɪməntri skuːl/",
    "type": "tiểu học",
    "meaning": "period",
    "VocabType": "NOUN"
  },
  {
    "word": "/ˈpɪəriəd/",
    "phonetic": "giai đoạn",
    "type": "experiment with",
    "meaning": "/ɪkˈsperɪmənt wɪð/",
    "VocabType": "NOUN"
  },
  {
    "word": "thử nghiệm với",
    "phonetic": "abstract compositions",
    "type": "/ˈæbstrækt ˌkɒmpəˈzɪʃnz/",
    "meaning": "bố cục trừu tượng",
    "VocabType": "NOUN"
  },
  {
    "word": "charcoal",
    "phonetic": "/ˈtʃɑːkəʊl/",
    "type": "than chì/than vẽ (chất liệu vẽ)",
    "meaning": "innovative",
    "VocabType": "NOUN"
  },
  {
    "word": "/ˈɪnəvətɪv/",
    "phonetic": "đổi mới/sáng tạo",
    "type": "drawing",
    "meaning": "/ˈdrɔːɪŋ/",
    "VocabType": "NOUN"
  },
  {
    "word": "tranh vẽ, bản vẽ",
    "phonetic": "lead (sb/sth) in a new direction",
    "type": "/liːd/",
    "meaning": "đưa (nghệ thuật) sang hướng mới",
    "VocabType": "NOUN"
  },
  {
    "word": "art collector",
    "phonetic": "/ɑːt kəˈlektə/",
    "type": "nhà sưu tầm nghệ thuật",
    "meaning": "photographer",
    "VocabType": "NOUN"
  },
  {
    "word": "/fəˈtɒɡrəfə/",
    "phonetic": "nhiếp ảnh gia",
    "type": "impressed",
    "meaning": "/ɪmˈprest/",
    "VocabType": "NOUN"
  },
  {
    "word": "ấn tượng",
    "phonetic": "exhibit",
    "type": "/ɪɡˈzɪbɪt/",
    "meaning": "trưng bày/triển lãm",
    "VocabType": "NOUN"
  },
  {
    "word": "gallery",
    "phonetic": "/ˈɡæləri/",
    "type": "phòng tranh",
    "meaning": "avant-garde",
    "VocabType": "NOUN"
  },
  {
    "word": "/ˌævɒ̃ːt ˈɡɑːd/",
    "phonetic": "tiên phong/phá cách",
    "type": "introduce to the public",
    "meaning": "/ˌɪntrəˈdjuːs/",
    "VocabType": "NOUN"
  },
  {
    "word": "giới thiệu tới công chúng",
    "phonetic": "encouragement",
    "type": "/ɪnˈkʌrɪdʒmənt/",
    "meaning": "sự động viên/khích lệ",
    "VocabType": "NOUN"
  },
  {
    "word": "financial support",
    "phonetic": "/faɪˈnænʃl səˈpɔːt/",
    "type": "hỗ trợ tài chính",
    "meaning": "career",
    "VocabType": "NOUN"
  },
  {
    "word": "/kəˈrɪə/",
    "phonetic": "sự nghiệp",
    "type": "vigorously",
    "meaning": "/ˈvɪɡərəsli/",
    "VocabType": "VERB"
  },
  {
    "word": "mạnh mẽ, quyết liệt",
    "phonetic": "promote",
    "type": "/prəˈməʊt/",
    "meaning": "quảng bá, nâng đỡ (nghệ sĩ/tác phẩm)",
    "VocabType": "NOUN"
  },
  {
    "word": "solo exhibition",
    "phonetic": "/ˌsəʊləʊ ˌeksɪˈbɪʃn/",
    "type": "triển lãm cá nhân",
    "meaning": "numerous",
    "VocabType": "NOUN"
  },
  {
    "word": "/ˈnjuːmərəs/",
    "phonetic": "rất nhiều",
    "type": "installation",
    "meaning": "/ˌɪnstəˈleɪʃn/",
    "VocabType": "NOUN"
  },
  {
    "word": "sắp đặt/trưng bày (tác phẩm trong không gian)",
    "phonetic": "ups and downs",
    "type": "/ˌʌps ən ˈdaʊnz/",
    "meaning": "thăng trầm",
    "VocabType": "NOUN"
  },
  {
    "word": "celebrated",
    "phonetic": "/ˈselɪbreɪtɪd/",
    "type": "nổi tiếng/được ca ngợi",
    "meaning": "portrait",
    "VocabType": "NOUN"
  },
  {
    "word": "/ˈpɔːtrət/",
    "phonetic": "chân dung",
    "type": "over the course of",
    "meaning": "/ˈəʊvə ðə kɔːs əv/",
    "VocabType": "NOUN"
  },
  {
    "word": "trong suốt quá trình",
    "phonetic": "recognised",
    "type": "/ˈrekəɡnaɪzd/",
    "meaning": "được công nhận",
    "VocabType": "NOUN"
  },
  {
    "word": "architectural",
    "phonetic": "/ˌɑːkɪˈtektʃərəl/",
    "type": "thuộc kiến trúc",
    "meaning": "depict",
    "VocabType": "NOUN"
  },
  {
    "word": "/dɪˈpɪkt/",
    "phonetic": "khắc hoạ/miêu tả",
    "type": "soaring",
    "meaning": "/ˈsɔːrɪŋ/",
    "VocabType": "NOUN"
  },
  {
    "word": "vút cao, cao chót vót",
    "phonetic": "skyscraper",
    "type": "/ˈskaɪskreɪpə/",
    "meaning": "nhà chọc trời",
    "VocabType": "NOUN"
  },
  {
    "word": "botanical",
    "phonetic": "/bəˈtænɪkl/",
    "type": "thuộc thực vật",
    "meaning": "subject (in art)",
    "VocabType": "NOUN"
  },
  {
    "word": "/ˈsʌbdʒɪkt/",
    "phonetic": "đề tài (trong tranh)",
    "type": "inspired by",
    "meaning": "/ɪnˈspaɪəd baɪ/",
    "VocabType": "NOUN"
  },
  {
    "word": "được truyền cảm hứng bởi",
    "phonetic": "magnified",
    "type": "/ˈmæɡnɪfaɪd/",
    "meaning": "phóng to",
    "VocabType": "NOUN"
  },
  {
    "word": "canvas",
    "phonetic": "/ˈkænvəs/",
    "type": "toan vẽ",
    "meaning": "emphasise",
    "VocabType": "NOUN"
  },
  {
    "word": "/ˈemfəsaɪz/",
    "phonetic": "nhấn mạnh",
    "type": "daring",
    "meaning": "/ˈdeərɪŋ/",
    "VocabType": "NOUN"
  },
  {
    "word": "táo bạo",
    "phonetic": "establish (a reputation)",
    "type": "/ɪˈstæblɪʃ/",
    "meaning": "tạo dựng (danh tiếng)",
    "VocabType": "NOUN"
  },
  {
    "word": "modernist",
    "phonetic": "/ˈmɒdənɪst/",
    "type": "thuộc chủ nghĩa hiện đại/ nghệ sĩ hiện đại",
    "meaning": "solitude",
    "VocabType": "NOUN"
  },
  {
    "word": "/ˈsɒlɪtjuːd/",
    "phonetic": "sự cô tịch/ở một mình (để sáng tác)",
    "type": "legacy",
    "meaning": "/ˈleɡəsi/",
    "VocabType": "NOUN"
  },
  {
    "word": "di sản",
    "phonetic": "derive inspiration",
    "type": "/dɪˈraɪv ˌɪnspəˈreɪʃn/",
    "meaning": "rút ra/nhận được cảm hứng",
    "VocabType": "NOUN"
  },
  {
    "word": "Từ vựng",
    "phonetic": "Phiên âm",
    "type": "Giải nghĩa",
    "meaning": "adapt (to)",
    "VocabType": "NOUN"
  },
  {
    "word": "/əˈdæpt/",
    "phonetic": "thích nghi với",
    "type": "effects",
    "meaning": "/ɪˈfekts/",
    "VocabType": "NOUN"
  },
  {
    "word": "tác động/hệ quả",
    "phonetic": "climate change",
    "type": "/ˈklaɪmət tʃeɪndʒ/",
    "meaning": "biến đổi khí hậu",
    "VocabType": "NOUN"
  },
  {
    "word": "impacts",
    "phonetic": "/ˈɪmpækts/",
    "type": "ảnh hưởng/tác động (mang tính hậu quả)",
    "meaning": "CO2 emissions",
    "VocabType": "NOUN"
  },
  {
    "word": "/ˌsiː əʊ tuː ɪˈmɪʃnz/",
    "phonetic": "khí thải CO₂",
    "type": "industrial times",
    "meaning": "/ɪnˈdʌstriəl taɪmz/",
    "VocabType": "NOUN"
  },
  {
    "word": "thời kỳ công nghiệp hoá",
    "phonetic": "forecast",
    "type": "/ˈfɔːkɑːst/",
    "meaning": "dự báo",
    "VocabType": "NOUN"
  },
  {
    "word": "global warming",
    "phonetic": "/ˌɡləʊbl ˈwɔːmɪŋ/",
    "type": "nóng lên toàn cầu",
    "meaning": "in the meantime",
    "VocabType": "NOUN"
  },
  {
    "word": "/ɪn ðə ˈmiːntaɪm/",
    "phonetic": "trong lúc đó",
    "type": "ice caps",
    "meaning": "/aɪs kæps/",
    "VocabType": "NOUN"
  },
  {
    "word": "chỏm băng (vùng cực)",
    "phonetic": "melt",
    "type": "/melt/",
    "meaning": "tan chảy",
    "VocabType": "NOUN"
  },
  {
    "word": "sea levels",
    "phonetic": "/ˈsiː ˌlevlz/",
    "type": "mực nước biển",
    "meaning": "rise",
    "VocabType": "NOUN"
  },
  {
    "word": "/raɪz/",
    "phonetic": "tăng lên/dâng lên",
    "type": "extreme impacts",
    "meaning": "/ɪkˈstriːm ˈɪmpækts/",
    "VocabType": "NOUN"
  },
  {
    "word": "tác động cực đoan/nghiêm trọng",
    "phonetic": "innovation",
    "type": "/ˌɪnəˈveɪʃn/",
    "meaning": "đổi mới, sáng kiến",
    "VocabType": "NOUN"
  },
  {
    "word": "thrive",
    "phonetic": "/θraɪv/",
    "type": "phát triển mạnh",
    "meaning": "seawater",
    "VocabType": "NOUN"
  },
  {
    "word": "/ˈsiːwɔːtə/",
    "phonetic": "nước biển",
    "type": "breach",
    "meaning": "/briːtʃ/",
    "VocabType": "NOUN"
  },
  {
    "word": "vượt qua/phá vỡ (đê, tường chắn)",
    "phonetic": "seep up",
    "type": "/siːp ʌp/",
    "meaning": "thấm ngược lên (từ dưới đất)",
    "VocabType": "NOUN"
  },
  {
    "word": "ground",
    "phonetic": "/ɡraʊnd/",
    "type": "mặt đất/lớp đất",
    "meaning": "lift (a city) up",
    "VocabType": "NOUN"
  },
  {
    "word": "/lɪft ʌp/",
    "phonetic": "nâng lên (ẩn dụ/giải pháp nâng cao nền)",
    "type": "above sea level",
    "meaning": "/əˌbʌv ˈsiː ˌlevl/",
    "VocabType": "NOUN"
  },
  {
    "word": "cao hơn mực nước biển",
    "phonetic": "vulnerable",
    "type": "/ˈvʌlnərəbl/",
    "meaning": "dễ bị tổn thương/dễ bị ảnh hưởng",
    "VocabType": "NOUN"
  },
  {
    "word": "neighbourhood",
    "phonetic": "/ˈneɪbəhʊd/",
    "type": "khu dân cư",
    "meaning": "raise (roads)",
    "VocabType": "NOUN"
  },
  {
    "word": "/reɪz/",
    "phonetic": "nâng lên (mặt đường)",
    "type": "centimetre",
    "meaning": "/ˈsentɪmiːtə/",
    "VocabType": "NOUN"
  },
  {
    "word": "xen-ti-mét",
    "phonetic": "elevation",
    "type": "/ˌelɪˈveɪʃn/",
    "meaning": "việc nâng cao độ cao",
    "VocabType": "NOUN"
  },
  {
    "word": "carry out",
    "phonetic": "/ˈkæri aʊt/",
    "type": "tiến hành/thực hiện",
    "meaning": "ambitious",
    "VocabType": "NOUN"
  },
  {
    "word": "/æmˈbɪʃəs/",
    "phonetic": "tham vọng/quy mô lớn",
    "type": "stormwater-management",
    "meaning": "/ˈstɔːmwɔːtə ˈmænɪdʒmənt/",
    "VocabType": "NOUN"
  },
  {
    "word": "quản lý nước mưa/ngập do mưa",
    "phonetic": "pump",
    "type": "/pʌmp/",
    "meaning": "máy bơm",
    "VocabType": "NOUN"
  },
  {
    "word": "remove (water)",
    "phonetic": "/rɪˈmuːv/",
    "type": "loại bỏ/rút (nước)",
    "meaning": "litre",
    "VocabType": "NOUN"
  },
  {
    "word": "/ˈliːtə/",
    "phonetic": "lít",
    "type": "per minute",
    "meaning": "/pə ˈmɪnɪt/",
    "VocabType": "NOUN"
  },
  {
    "word": "mỗi phút",
    "phonetic": "in the face of",
    "type": "/ɪn ðə feɪs əv/",
    "meaning": "trước/đối mặt với",
    "VocabType": "NOUN"
  },
  {
    "word": "floods",
    "phonetic": "/flʌdz/",
    "type": "lũ lụt/ngập lụt",
    "meaning": "climate-mitigation",
    "VocabType": "NOUN"
  },
  {
    "word": "/ˈklaɪmət ˌmɪtɪˈɡeɪʃn/",
    "phonetic": "giảm nhẹ tác động khí hậu (mitigation)",
    "type": "overlook",
    "meaning": "/ˌəʊvəˈlʊk/",
    "VocabType": "NOUN"
  },
  {
    "word": "bị bỏ qua",
    "phonetic": "essential",
    "type": "/ɪˈsenʃl/",
    "meaning": "thiết yếu",
    "VocabType": "NOUN"
  },
  {
    "word": "adjust",
    "phonetic": "/əˈdʒʌst/",
    "type": "điều chỉnh",
    "meaning": "seawall",
    "VocabType": "NOUN"
  },
  {
    "word": "/ˈsiːwɔːl/",
    "phonetic": "đê/tường chắn biển",
    "type": "staple strategy",
    "meaning": "/ˌsteɪpl ˈstrætədʒi/",
    "VocabType": "NOUN"
  },
  {
    "word": "chiến lược “mặc định”, dùng phổ biến",
    "phonetic": "coastal community",
    "type": "/ˈkəʊstl kəˈmjuːnəti/",
    "meaning": "cộng đồng ven biển",
    "VocabType": "NOUN"
  },
  {
    "word": "collapse",
    "phonetic": "/kəˈlæps/",
    "type": "sụp đổ",
    "meaning": "exacerbate",
    "VocabType": "NOUN"
  },
  {
    "word": "/ɪɡˈzæsəbeɪt/",
    "phonetic": "làm trầm trọng hơn",
    "type": "coastal erosion",
    "meaning": "/ˈkəʊstl ɪˈrəʊʒn/",
    "VocabType": "NOUN"
  },
  {
    "word": "xói mòn bờ biển",
    "phonetic": "restore",
    "type": "/rɪˈstɔː/",
    "meaning": "phục hồi",
    "VocabType": "NOUN"
  },
  {
    "word": "mangrove",
    "phonetic": "/ˈmæŋɡrəʊv/",
    "type": "rừng ngập mặn/cây ngập mặn",
    "meaning": "ecosystem",
    "VocabType": "NOUN"
  },
  {
    "word": "/ˈiːkəʊˌsɪstəm/",
    "phonetic": "hệ sinh thái",
    "type": "shrub",
    "meaning": "/ʃrʌb/",
    "VocabType": "NOUN"
  },
  {
    "word": "cây bụi",
    "phonetic": "defend",
    "type": "/dɪˈfend/",
    "meaning": "bảo vệ/chắn giữ",
    "VocabType": "NOUN"
  },
  {
    "word": "trap sediment",
    "phonetic": "/træp ˈsedɪmənt/",
    "type": "giữ/bẫy trầm tích",
    "meaning": "net-like root systems",
    "VocabType": "NOUN"
  },
  {
    "word": "/ˈnet laɪk ruːt ˈsɪstəmz/",
    "phonetic": "hệ rễ dạng lưới",
    "type": "dampen",
    "meaning": "/ˈdæmpən/",
    "VocabType": "NOUN"
  },
  {
    "word": "làm giảm (năng lượng/tác động)",
    "phonetic": "tidal currents",
    "type": "/ˈtaɪdl ˈkʌrənts/",
    "meaning": "dòng chảy thuỷ triều",
    "VocabType": "NOUN"
  },
  {
    "word": "not-for-profit",
    "phonetic": "/ˌnɒt fə ˈprɒfɪt/",
    "type": "phi lợi nhuận",
    "meaning": "approach",
    "VocabType": "NOUN"
  },
  {
    "word": "/əˈprəʊtʃ/",
    "phonetic": "cách tiếp cận",
    "type": "semi-permeable",
    "meaning": "/ˌsemi ˈpɜːmiəbl/",
    "VocabType": "NOUN"
  },
  {
    "word": "bán thấm (cho nước đi qua phần nào)",
    "phonetic": "dam",
    "type": "/dæm/",
    "meaning": "đập/chắn nước",
    "VocabType": "NOUN"
  },
  {
    "word": "bamboo poles",
    "phonetic": "/ˌbæmˈbuː pəʊlz/",
    "type": "cọc tre",
    "meaning": "brushwood",
    "VocabType": "NOUN"
  },
  {
    "word": "/ˈbrʌʃwʊd/",
    "phonetic": "cành que/bụi cây khô dùng làm vật liệu",
    "type": "mimic",
    "meaning": "/ˈmɪmɪk/",
    "VocabType": "NOUN"
  },
  {
    "word": "mô phỏng",
    "phonetic": "favourable conditions",
    "type": "/ˈfeɪvərəbl kənˈdɪʃnz/",
    "meaning": "điều kiện thuận lợi",
    "VocabType": "NOUN"
  },
  {
    "word": "naturally",
    "phonetic": "/ˈnætʃrəli/",
    "type": "một cách tự nhiên",
    "meaning": "moderate success",
    "VocabType": "NOUN"
  },
  {
    "word": "/ˈmɒdərət səkˈses/",
    "phonetic": "thành công ở mức vừa phải",
    "type": "subsidence",
    "meaning": "/səbˈsaɪdəns/",
    "VocabType": "NOUN"
  },
  {
    "word": "sụt lún đất",
    "phonetic": "long-term",
    "type": "/ˌlɒŋ ˈtɜːm/",
    "meaning": "dài hạn",
    "VocabType": "NOUN"
  },
  {
    "word": "transition towards",
    "phonetic": "/trænˈzɪʃn təˈwɔːdz/",
    "type": "chuyển dịch hướng tới",
    "meaning": "multifunctional approaches",
    "VocabType": "NOUN"
  },
  {
    "word": "/ˌmʌltiˈfʌŋkʃənl əˈprəʊtʃɪz/",
    "phonetic": "cách tiếp cận đa chức năng",
    "type": "embed natural processes",
    "meaning": "/ɪmˈbed ˈnætʃrəl ˈprəʊsesɪz/",
    "VocabType": "NOUN"
  },
  {
    "word": "“cài vào”/tích hợp các quá trình tự nhiên",
    "phonetic": "Từ vựng",
    "type": "Phiên âm",
    "meaning": "Giải nghĩa",
    "VocabType": "NOUN"
  },
  {
    "word": "livestock",
    "phonetic": "/ˈlaɪvstɒk/",
    "type": "gia súc (động vật nuôi lấy thịt/sữa…)",
    "meaning": "guard dog",
    "VocabType": "NOUN"
  },
  {
    "word": "/ˈɡɑːd dɒɡ/",
    "phonetic": "chó canh gác/chó bảo vệ",
    "type": "traditionally",
    "meaning": "/trəˈdɪʃənəli/",
    "VocabType": "NOUN"
  },
  {
    "word": "theo truyền thống",
    "phonetic": "protect",
    "type": "/prəˈtekt/",
    "meaning": "bảo vệ",
    "VocabType": "NOUN"
  },
  {
    "word": "predator",
    "phonetic": "/ˈpredətə/",
    "type": "động vật săn mồi/thú ăn thịt",
    "meaning": "work alongside",
    "VocabType": "NOUN"
  },
  {
    "word": "/wɜːk əˌlɒŋˈsaɪd/",
    "phonetic": "làm việc cùng/đồng hành với",
    "type": "shepherd",
    "meaning": "/ˈʃepəd/",
    "VocabType": "NOUN"
  },
  {
    "word": "người chăn cừu",
    "phonetic": "goat",
    "type": "/ɡəʊt/",
    "meaning": "dê",
    "VocabType": "NOUN"
  },
  {
    "word": "cattle",
    "phonetic": "/ˈkætl/",
    "type": "bò (đàn bò)",
    "meaning": "wolf",
    "VocabType": "NOUN"
  },
  {
    "word": "/wʊlf/",
    "phonetic": "sói",
    "type": "bear",
    "meaning": "/beə/",
    "VocabType": "NOUN"
  },
  {
    "word": "gấu",
    "phonetic": "exterminate",
    "type": "/ɪkˈstɜːmɪneɪt/",
    "meaning": "tiêu diệt tận diệt",
    "VocabType": "NOUN"
  },
  {
    "word": "in recent years",
    "phonetic": "/ɪn ˈriːsnt jɪəz/",
    "type": "những năm gần đây",
    "meaning": "increased efforts",
    "VocabType": "NOUN"
  },
  {
    "word": "/ɪnˈkriːst ˈefəts/",
    "phonetic": "nỗ lực gia tăng",
    "type": "wild animals",
    "meaning": "/waɪld ˈænɪməlz/",
    "VocabType": "NOUN"
  },
  {
    "word": "động vật hoang dã",
    "phonetic": "more widespread",
    "type": "/mɔː ˈwaɪdspred/",
    "meaning": "phổ biến/rộng khắp hơn",
    "VocabType": "NOUN"
  },
  {
    "word": "as a result",
    "phonetic": "/æz ə rɪˈzʌlt/",
    "type": "vì vậy/kết quả là",
    "meaning": "once more",
    "VocabType": "VERB"
  },
  {
    "word": "/wʌns mɔː/",
    "phonetic": "một lần nữa",
    "type": "unexpected revival",
    "meaning": "/ˌʌnɪkˈspektɪd rɪˈvaɪvl/",
    "VocabType": "NOUN"
  },
  {
    "word": "sự hồi sinh bất ngờ",
    "phonetic": "breed",
    "type": "/briːd/",
    "meaning": "giống (chó)",
    "VocabType": "NOUN"
  },
  {
    "word": "on duty",
    "phonetic": "/ɒn ˈdjuːti/",
    "type": "đang làm nhiệm vụ",
    "meaning": "various",
    "VocabType": "NOUN"
  },
  {
    "word": "/ˈveəriəs/",
    "phonetic": "nhiều/vài loại khác nhau",
    "type": "raise (from an early age)",
    "meaning": "/reɪz/",
    "VocabType": "NOUN"
  },
  {
    "word": "nuôi/dạy từ nhỏ",
    "phonetic": "eventually",
    "type": "/ɪˈventʃuəli/",
    "meaning": "cuối cùng thì",
    "VocabType": "NOUN"
  },
  {
    "word": "threat",
    "phonetic": "/θret/",
    "type": "mối đe doạ",
    "meaning": "place themselves between",
    "VocabType": "NOUN"
  },
  {
    "word": "/pleɪs ðəmˈselvz bɪˈtwiːn/",
    "phonetic": "đứng chặn ở giữa (để chắn)",
    "type": "bark loudly",
    "meaning": "/bɑːk ˈlaʊdli/",
    "VocabType": "NOUN"
  },
  {
    "word": "sủa to",
    "phonetic": "if necessary",
    "type": "/ɪf ˈnesəsəri/",
    "meaning": "nếu cần thiết",
    "VocabType": "NOUN"
  },
  {
    "word": "chase away",
    "phonetic": "/tʃeɪs əˈweɪ/",
    "type": "đuổi đi",
    "meaning": "mere presence",
    "VocabType": "NOUN"
  },
  {
    "word": "/mɪə ˈprezns/",
    "phonetic": "chỉ riêng sự có mặt thôi",
    "type": "sufficient",
    "meaning": "/səˈfɪ��nt/",
    "VocabType": "NOUN"
  },
  {
    "word": "đủ",
    "phonetic": "initial training",
    "type": "/ɪˈnɪʃl ˈtreɪnɪŋ/",
    "meaning": "huấn luyện ban đầu",
    "VocabType": "NOUN"
  },
  {
    "word": "fluffy",
    "phonetic": "/ˈflʌfi/",
    "type": "bông xù, mềm như bông",
    "meaning": "puppy",
    "VocabType": "NOUN"
  },
  {
    "word": "/ˈpʌpi/",
    "phonetic": "chó con",
    "type": "human affection",
    "meaning": "/ˈhjuːmən əˈfekʃn/",
    "VocabType": "NOUN"
  },
  {
    "word": "sự âu yếm của con người",
    "phonetic": "front porch",
    "type": "/frʌnt pɔːtʃ/",
    "meaning": "hiên trước nhà",
    "VocabType": "NOUN"
  },
  {
    "word": "evidence",
    "phonetic": "/ˈevɪdəns/",
    "type": "bằng chứng",
    "meaning": "indicate",
    "VocabType": "NOUN"
  },
  {
    "word": "/ˈɪndɪkeɪt/",
    "phonetic": "cho thấy",
    "type": "highly effective",
    "meaning": "/ˌhaɪli ɪˈfektɪv/",
    "VocabType": "NOUN"
  },
  {
    "word": "cực kỳ hiệu quả",
    "phonetic": "participate (in)",
    "type": "/pɑːˈtɪsɪpeɪt/",
    "meaning": "tham gia",
    "VocabType": "NOUN"
  },
  {
    "word": "programme",
    "phonetic": "/ˈprəʊɡræm/",
    "type": "chương trình (BrE)",
    "meaning": "herd",
    "VocabType": "NOUN"
  },
  {
    "word": "/hɜːd/",
    "phonetic": "đàn gia súc",
    "type": "against attack",
    "meaning": "/əˌɡenst əˈtæk/",
    "VocabType": "NOUN"
  },
  {
    "word": "chống lại sự tấn công",
    "phonetic": "rate (performance)",
    "type": "/reɪt/",
    "meaning": "đánh giá/xếp hạng",
    "VocabType": "NOUN"
  },
  {
    "word": "performance",
    "phonetic": "/pəˈfɔːməns/",
    "type": "hiệu suất/khả năng hoạt động",
    "meaning": "excellent",
    "VocabType": "NOUN"
  },
  {
    "word": "/ˈeksələnt/",
    "phonetic": "xuất sắc",
    "type": "study",
    "meaning": "/ˈstʌdi/",
    "VocabType": "NOUN"
  },
  {
    "word": "nghiên cứu",
    "phonetic": "report (that)",
    "type": "/rɪˈpɔːt/",
    "meaning": "báo cáo/cho biết",
    "VocabType": "NOUN"
  },
  {
    "word": "predation",
    "phonetic": "/prɪˈdeɪʃn/",
    "type": "sự săn mồi (hành vi thú săn mồi giết con mồi)",
    "meaning": "decrease (in attacks)",
    "VocabType": "NOUN"
  },
  {
    "word": "/dɪˈkriːs/",
    "phonetic": "sự giảm (các cuộc tấn công)",
    "type": "managed properly",
    "meaning": "/ˈmænɪdʒd ˈprɒpəli/",
    "VocabType": "NOUN"
  },
  {
    "word": "được quản lý đúng cách",
    "phonetic": "efficient",
    "type": "/ɪˈfɪʃnt/",
    "meaning": "hiệu quả (tốn ít nguồn lực)",
    "VocabType": "NOUN"
  },
  {
    "word": "control method",
    "phonetic": "/kənˈtrəʊl ˈmeθəd/",
    "type": "phương pháp kiểm soát",
    "meaning": "preserve",
    "VocabType": "NOUN"
  },
  {
    "word": "/prɪˈzɜːv/",
    "phonetic": "bảo tồn",
    "type": "reduction",
    "meaning": "/rɪˈdʌkʃn/",
    "VocabType": "NOUN"
  },
  {
    "word": "sự giảm",
    "phonetic": "livestock losses",
    "type": "/ˈlaɪvstɒk ˈlɒsɪz/",
    "meaning": "thiệt hại gia súc (bị mất/ bị giết)",
    "VocabType": "NOUN"
  },
  {
    "word": "tolerant (of)",
    "phonetic": "/ˈtɒlərənt/",
    "type": "khoan dung/chấp nhận hơn",
    "meaning": "less likely to",
    "VocabType": "NOUN"
  },
  {
    "word": "/les ˈlaɪkli tuː/",
    "phonetic": "ít có khả năng",
    "type": "cheetah",
    "meaning": "/ˈtʃiːtə/",
    "VocabType": "NOUN"
  },
  {
    "word": "báo gê-pa",
    "phonetic": "protected areas",
    "type": "/prəˈtektɪd ˈeəriəz/",
    "meaning": "khu bảo tồn/khu được bảo vệ",
    "VocabType": "NOUN"
  },
  {
    "word": "held responsible",
    "phonetic": "/held rɪˈspɒnsəbl/",
    "type": "bị quy trách nhiệm",
    "meaning": "dramatic",
    "VocabType": "NOUN"
  },
  {
    "word": "/drəˈmætɪk/",
    "phonetic": "mạnh/đáng kể (giảm mạnh)",
    "type": "apply widely",
    "meaning": "/əˈplaɪ ˈwaɪdli/",
    "VocabType": "NOUN"
  },
  {
    "word": "áp dụng rộng rãi",
    "phonetic": "common ground",
    "type": "/ˌkɒmən ˈɡraʊnd/",
    "meaning": "điểm chung",
    "VocabType": "NOUN"
  },
  {
    "word": "rancher",
    "phonetic": "/ˈrɑːntʃə/",
    "type": "chủ trang trại chăn thả",
    "meaning": "permit",
    "VocabType": "NOUN"
  },
  {
    "word": "/ˈpɜːmɪt/",
    "phonetic": "giấy phép",
    "type": "pinch of salt",
    "meaning": "/ˌpɪntʃ əv ˈsɔːlt/",
    "VocabType": "NOUN"
  },
  {
    "word": "thái độ hoài nghi nhẹ (đừng tin 100%)",
    "phonetic": "self-reported",
    "type": "/ˌself rɪˈpɔːtɪd/",
    "meaning": "tự báo cáo (không kiểm chứng độc lập)",
    "VocabType": "NOUN"
  },
  {
    "word": "displace",
    "phonetic": "/dɪsˈpleɪs/",
    "type": "đẩy dịch chuyển (sang nơi khác)",
    "meaning": "unintended ecological effects",
    "VocabType": "NOUN"
  }
];

async function ensureSystemUser() {
  const systemUser = await prisma.user.findFirst({ where: { email: 'system@ielts-app.local' } });
  if (systemUser) return systemUser.idUser;
  const created = await prisma.user.create({
    data: {
      email: 'system@ielts-app.local',
      nameUser: 'System',
      password: 'SYSTEM_PLACEHOLDER',
      role: 'ADMIN',
      isActive: true,
      accountType: 'LOCAL',
      gender: 'Male',
    },
  });
  return created.idUser;
}

async function seed() {
  console.log('=== Seeding 586 Cambridge IELTS 20 words ===');
  const systemUserId = await ensureSystemUser();

  const existing = await prisma.vocabulary.findMany({ where: { tier: 3 }, select: { word: true } });
  const existingWords = new Set(existing.map(w => w.word.toLowerCase()));

  const newWords = CAMBRIDGE_IELTS_20.filter(w => !existingWords.has(w.word.toLowerCase()));
  console.log('New words to insert: ' + newWords.length);

  let inserted = 0;
  for (let i = 0; i < newWords.length; i += 100) {
    const batch = newWords.slice(i, i + 100);
    await prisma.vocabulary.createMany({
      data: batch.map((w, idx) => ({
        word: w.word,
        phonetic: w.phonetic,
        meaning: w.meaning,
        VocabType: w.VocabType,
        level: 'High',
        tier: 3,
        frequencyRank: 6001 + i + idx,
        idUser: systemUserId,
        status: 'new',
      })),
      skipDuplicates: true,
    });
    inserted += batch.length;
    console.log('Progress: ' + inserted + '/' + newWords.length);
  }

  console.log('Done! Inserted ' + inserted + ' words');
  await prisma.$disconnect();
}

seed().catch(console.error);
