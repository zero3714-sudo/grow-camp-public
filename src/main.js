import Phaser from 'phaser'
import './style.css'

// =====================================================
// 게임 에셋 경로 - grow-camp-public/public/assets 하나로 통일
// Vite / StackBlitz / GitHub Pages 모두 같은 로컬 에셋을 사용
// 이미지 교체 후 캐시가 남으면 *_ASSET_VERSION 숫자만 올리면 됨
// =====================================================
const ASSET_BASE = `${import.meta.env.BASE_URL}assets`

const EQUIPMENT_ASSET_BASE = `${ASSET_BASE}/equipment`
const CHARACTER_ASSET_BASE = `${ASSET_BASE}/characters`
const BACKGROUND_ASSET_BASE = ASSET_BASE
const UI_ICON_ASSET_BASE = `${ASSET_BASE}/ui`

const EQUIPMENT_ASSET_VERSION = '3'
const CHARACTER_ASSET_VERSION = '6'
const BACKGROUND_ASSET_VERSION = '5'
const UI_ICON_ASSET_VERSION = '4'
const ENDING_BOOK_ASSET_VERSION = '1'

const BACKGROUND_FILES = {
  1: 'background_1.png', // 낮 - 1~3턴
  2: 'background_2.png', // 석양 - 4~6턴
  3: 'background_3.png', // 밤 - 7~10턴
  4: 'background_4.png'  // 일반 엔딩 1~4 연출
}


const UI_ICON_FILES = {
  shrineMaiden: 'shrineMaiden_icon.png',
  maid: 'maid_icon.png',
  ghost: 'ghost_icon.png',
  alchemist: 'alchemist_icon.png',
  camperVan: 'camperVan_icon.png',
  campfire: 'campfire_icon.png',
  tent: 'tent_icon.png',
  cookware: 'cookware_icon.png',
  lantern: 'lantern_icon.png',
  telescope: 'telescope_icon.png'
}

const EQUIPMENT_ASSET_NAMES = [
  'camperVan',
  'campfire',
  'tent',
  'cookware',
  'lantern',
  'telescope'
]

const CHARACTER_ASSET_NAMES = [
  'shrineMaiden',
  'maid',
  'ghost',
  'alchemist'
]

// 캐릭터 Idle PNG = 가로 6프레임 스프라이트 시트
// 예: 960x160 PNG라면 프레임 하나는 160x160
const CHARACTER_IDLE_FRAME_COUNT = 6
const CHARACTER_IDLE_FPS = 6


const CHARACTER_DISPLAY_HEIGHT = 160

// =====================================================
// 캐릭터 / 배경 톤 통일
// =====================================================
// 캐릭터가 배경 위에 스티커처럼 뜨는 느낌을 줄이기 위한 값.
// 너무 누렇게 느껴지면 CHARACTER_SCENE_TINT를 0xfff8ee 쪽으로 올리면 됨.
const CHARACTER_SCENE_TINT = 0xfff3e6

// 발밑 접지 그림자
const CHARACTER_SHADOW_COLOR = 0x46513a
const CHARACTER_SHADOW_ALPHA = 0.24
const CHARACTER_SHADOW_WIDTH = 56
const CHARACTER_SHADOW_HEIGHT = 14

// 캐릭터별 실제 발 위치에 맞춘 그림자 중심 Y.
// 무녀/유령은 원본 PNG의 투명 여백 때문에 기본값보다 위로 붙인다.
const CHARACTER_SHADOW_Y_BY_KEY = {
  shrineMaiden: 25,
  maid: 29,
  ghost: 23,
  alchemist: 29
}

// 배경만 살짝 눌러서 캐릭터와 명도/채도 차이를 줄임.
// 캐릭터/UI에는 적용되지 않음.
const BACKGROUND_TONE_COLOR = 0x574f45
const BACKGROUND_TONE_ALPHA = 0.10

const EQUIPMENT_SPRITE_CONFIG = {
  camperVan: { width: 220, statusY: 100 },
  campfire: { width: 172, statusY: 92 },
  tent: { width: 250, statusY: 122 },
  cookware: { width: 168, stage1Width: 84, statusY: 100 },
  lantern: { width: 108, statusY: 84 },
  telescope: { width: 178, statusY: 98 }
}

// 새 픽셀아트 에셋은 원본 색감을 그대로 사용
const EQUIPMENT_SPRITE_ALPHA = 1

function getEquipmentDisplayWidth(key, stage) {
  const config = EQUIPMENT_SPRITE_CONFIG[key]
  if (!config) return 0
  if (stage === 1 && config.stage1Width) return config.stage1Width
  return config.width
}

class MainScene extends Phaser.Scene {
  constructor() {
    super('MainScene')
  }

  preload() {
    Object.entries(BACKGROUND_FILES).forEach(([index, filename]) => {
      this.load.image(
        `background_${index}`,
        `${BACKGROUND_ASSET_BASE}/${filename}?v=${BACKGROUND_ASSET_VERSION}`
      )
    })

    Object.entries(UI_ICON_FILES).forEach(([key, filename]) => {
      this.load.image(
        `ui_${key}`,
        `${UI_ICON_ASSET_BASE}/${filename}?v=${UI_ICON_ASSET_VERSION}`
      )
    })

    this.load.image(
      'ending_book_bg',
      `${UI_ICON_ASSET_BASE}/endingbook.png?v=${ENDING_BOOK_ASSET_VERSION}`
    )

    EQUIPMENT_ASSET_NAMES.forEach(name => {
      for (let stage = 1; stage <= 3; stage++) {
        const key = `${name}_${stage}`
        const url =
          `${EQUIPMENT_ASSET_BASE}/${key}.png?v=${EQUIPMENT_ASSET_VERSION}`

        this.load.image(key, url)
      }
    })

    CHARACTER_ASSET_NAMES.forEach(name => {
      const idleKey = `${name}_idle`
      const idleUrl =
        `${CHARACTER_ASSET_BASE}/${idleKey}.png?v=${CHARACTER_ASSET_VERSION}`

      const hiddenKey = `${name}_hidden`
      const hiddenUrl =
        `${CHARACTER_ASSET_BASE}/${hiddenKey}.png?v=${CHARACTER_ASSET_VERSION}`

      this.load.image(idleKey, idleUrl)
      this.load.image(hiddenKey, hiddenUrl)
    })

    // 히든 캐릭터 전용 에셋
    ;['hidden_appear', 'hidden_effect', 'hidden_cut', 'hidden_end'].forEach(key => {
      this.load.image(
        key,
        `${CHARACTER_ASSET_BASE}/${key}.png?v=${CHARACTER_ASSET_VERSION}`
      )
    })

    this.load.on('loaderror', file => {
      console.error(
        `[GROW CAMP] 이미지 로드 실패: ${file.key}`,
        file.src
      )
    })
  }

  create() {
    const scene = this

    // =====================================================
    // 캐릭터 애니메이션 시트 준비
    // PNG 한 장을 가로 프레임 수만큼 자동 분할
    // =====================================================
    function prepareCharacterSheet(
      textureKey,
      framePrefix,
      frameCount,
      animKey,
      frameRate,
      yoyo = false
    ) {
      const texture = scene.textures.get(textureKey)

      if (!texture || texture.key === '__MISSING') {
        console.error(`[GROW CAMP] 캐릭터 텍스처 없음: ${textureKey}`)
        return
      }

      texture.setFilter(Phaser.Textures.FilterMode.NEAREST)

      const source = texture.getSourceImage()
      if (!source || source.width <= 0 || source.height <= 0) return

      const frameWidth = Math.floor(source.width / frameCount)
      const frameHeight = source.height

      for (let i = 0; i < frameCount; i++) {
        const frameName = `${framePrefix}_${i}`

        if (!texture.has(frameName)) {
          texture.add(
            frameName,
            0,
            i * frameWidth,
            0,
            frameWidth,
            frameHeight
          )
        }
      }

      if (!scene.anims.exists(animKey)) {
        scene.anims.create({
          key: animKey,
          frames: Array.from(
            { length: frameCount },
            (_, i) => ({
              key: textureKey,
              frame: `${framePrefix}_${i}`
            })
          ),
          frameRate,
          repeat: -1,
          yoyo
        })
      }
    }

    CHARACTER_ASSET_NAMES.forEach(characterKey => {
      prepareCharacterSheet(
        `${characterKey}_idle`,
        'idle',
        CHARACTER_IDLE_FRAME_COUNT,
        `${characterKey}_idle_anim`,
        CHARACTER_IDLE_FPS,
        false
      )
    })


    // =====================================================
    // 히든 연기 4프레임 애니메이션
    // hidden_effect.png = 가로 4프레임 스트립
    // 한 장을 늘리는 방식이 아니라 idle처럼 4프레임을 순서대로 재생한다.
    // =====================================================
    function prepareHiddenSmokeAnimation() {
      const texture = scene.textures.get('hidden_effect')
      if (!texture || texture.key === '__MISSING') {
        console.error('[GROW CAMP] hidden_effect 텍스처 없음')
        return false
      }

      texture.setFilter(Phaser.Textures.FilterMode.LINEAR)

      const source = texture.getSourceImage()
      if (!source || source.width <= 0 || source.height <= 0) return false

      const frameCount = 4
      const frameWidth = Math.floor(source.width / frameCount)
      const frameHeight = source.height

      for (let i = 0; i < frameCount; i++) {
        const frameName = `smoke_${i}`
        if (!texture.has(frameName)) {
          texture.add(
            frameName,
            0,
            i * frameWidth,
            0,
            frameWidth,
            frameHeight
          )
        }
      }

      if (!scene.anims.exists('hidden_smoke_anim')) {
        scene.anims.create({
          key: 'hidden_smoke_anim',
          frames: Array.from({ length: frameCount }, (_, i) => ({
            key: 'hidden_effect',
            frame: `smoke_${i}`
          })),
          frameRate: 11,
          repeat: 1
        })
      }

      return true
    }

    const hiddenSmokeReady = prepareHiddenSmokeAnimation()
    // =====================================================
    // DEBUG ONLY - 개발 중 상호작용 슬롯만 표시
    // 노란 이동 노드/경로는 순간이동 전환으로 완전히 제거
    // =====================================================
    const DEBUG_SHOW_INTERACTION_POINTS = import.meta.env.DEV

    // 마지막 ! 연출 뒤 다음 입력까지 기다리는 시간
    const AFTER_ACTION_LOCK_MS = 2000

    // 히든 엔딩 전용 연출
    const HIDDEN_MOVE_SPEED = 720 // 기존 캐릭터보다 빠른 화면 이동
    const HIDDEN_CHARACTER_HEIGHT = 160
    const HIDDEN_STAGE3_LEVEL = 7
    const HIDDEN_OBJECT_PAUSE_MS = 180

    // =====================================================
    // 저장 데이터
    // =====================================================
    const STORAGE_KEY = 'growCampProgressV2'

    const DEFAULT_PROGRESS = {
      resetCount: 0,
      endings: {
        miko: false,
        maid: false,
        ghost: false,
        alchemist: false,
        fail: false,
        hidden: false
      }
    }

    function loadProgress() {
      try {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (!saved) return JSON.parse(JSON.stringify(DEFAULT_PROGRESS))

        const parsed = JSON.parse(saved)
        return {
          resetCount: parsed.resetCount || 0,
          endings: {
            ...DEFAULT_PROGRESS.endings,
            ...(parsed.endings || {})
          }
        }
      } catch (error) {
        return JSON.parse(JSON.stringify(DEFAULT_PROGRESS))
      }
    }

    const progress = loadProgress()

    function saveProgress() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
      } catch (error) {
        console.warn('저장 실패', error)
      }
    }

    // =====================================================
    // 1~10 게임 요소
    // 캐릭터 이동은 경로 탐색 없이 장비별 상호작용 슬롯으로 순간이동한다.
    // =====================================================
    const ITEM_DEFS = [
      { id: 1, key: 'shrineMaiden', name: '무녀', type: 'character' },
      { id: 2, key: 'maid', name: '메이드', type: 'character' },
      { id: 3, key: 'ghost', name: '유령', type: 'character' },
      { id: 4, key: 'alchemist', name: '연금술사', type: 'character' },

      { id: 5, key: 'camperVan', name: '캠핑카', type: 'equipment', x: 450, y: 405 },
      { id: 6, key: 'campfire', name: '캠프파이어', type: 'equipment', x: 955, y: 520 },
      { id: 7, key: 'tent', name: '텐트', type: 'equipment', x: 1435, y: 420 },
      { id: 8, key: 'cookware', name: '조리도구', type: 'equipment', x: 1240, y: 630 },
      { id: 9, key: 'lantern', name: '랜턴', type: 'equipment', x: 1550, y: 605 },
      { id: 10, key: 'telescope', name: '망원경', type: 'equipment', x: 1040, y: 385 }
    ]

    // 캐릭터 기본 대기 위치
    const ACTIVE_IDLE_TARGETS = {
      1: { point: { x: 675, y: 470 } },
      2: { point: { x: 735, y: 600 } },
      3: { point: { x: 1260, y: 455 } },
      4: { point: { x: 1585, y: 455 } }
    }

    // =====================================================
    // 히든 엔딩 전용 캐릭터 집결 노드
    // 배경 왼쪽 아래 다리의 필드 쪽 입구 앞에 4명 전용 자리 배치.
    // 필요하면 여기 좌표만 바꾸면 된다.
    // =====================================================
    const HIDDEN_ENDING_CHARACTER_NODES = {
      // 기존 위치보다 북동쪽(+X, -Y) 공터로 이동.
      // 엔딩 패널/하단 메시지 및 다리 배경과 겹치지 않도록 위쪽에 배치한다.
      1: { point: { x: 540, y: 550 } }, // 무녀
      2: { point: { x: 610, y: 575 } }, // 메이드
      3: { point: { x: 680, y: 600 } }, // 유령
      4: { point: { x: 750, y: 625 } }  // 연금술사
    }

    // 장비별 상호작용 슬롯.
    // 각 장비에 4자리를 두어 여러 캐릭터가 동시에 반응해도 서로 같은 좌표를 잡지 않는다.
    const ACTION_SLOTS = {
      5: [
        { point: { x: 560, y: 390 } },
        { point: { x: 565, y: 455 } },
        { point: { x: 425, y: 505 } },
        { point: { x: 520, y: 520 } }
      ],
      6: [
        { point: { x: 840, y: 500 } },
        { point: { x: 1070, y: 500 } },
        { point: { x: 875, y: 585 } },
        { point: { x: 1035, y: 585 } }
      ],
      7: [
        { point: { x: 1315, y: 425 } },
        { point: { x: 1550, y: 425 } },
        { point: { x: 1360, y: 510 } },
        { point: { x: 1505, y: 510 } }
      ],
      8: [
        { point: { x: 1125, y: 610 } },
        { point: { x: 1350, y: 610 } },
        { point: { x: 1160, y: 690 } },
        { point: { x: 1320, y: 690 } }
      ],
      9: [
        { point: { x: 1450, y: 565 } },
        { point: { x: 1640, y: 565 } },
        { point: { x: 1470, y: 665 } },
        { point: { x: 1615, y: 665 } }
      ],
      10: [
        { point: { x: 925, y: 400 } },
        { point: { x: 1150, y: 400 } },
        { point: { x: 970, y: 475 } },
        { point: { x: 1115, y: 475 } }
      ]
    }

    const CHARACTER_INTERACTIONS = {
      1: [6, 9, 10],
      2: [8, 7, 5],
      3: [9, 10, 7],
      4: [8, 6, 5]
    }

    // =====================================================
    // 행동 후 지역 대기 위치
    // 행동이 끝난 캐릭터는 원래 출발점까지 돌아가지 않고
    // 방금 사용한 장비 근처에서 길을 비운 채 대기한다.
    // =====================================================
    const POST_ACTION_IDLE_POINTS = {
      '5-2': { x: 545, y: 430 },  // 캠핑카 - 메이드
      '5-4': { x: 520, y: 490 },  // 캠핑카 - 연금술사

      '6-1': { x: 845, y: 560 },  // 캠프파이어 - 무녀
      '6-4': { x: 1070, y: 565 }, // 캠프파이어 - 연금술사

      '7-2': { x: 1345, y: 505 }, // 텐트 - 메이드
      '7-3': { x: 1490, y: 520 }, // 텐트 - 유령

      '8-2': { x: 1135, y: 670 }, // 조리도구 - 메이드
      '8-4': { x: 1320, y: 680 }, // 조리도구 - 연금술사

      '9-1': { x: 1455, y: 650 }, // 랜턴 - 무녀
      '9-3': { x: 1580, y: 675 }, // 랜턴 - 유령

      '10-1': { x: 925, y: 455 }, // 망원경 - 무녀
      '10-3': { x: 1120, y: 465 } // 망원경 - 유령
    }

    // =====================================================
    // 12개 캐릭터 × 장비 상호작용
    // 지금은 코드 연출용. 나중에 각 Action 스프라이트로 교체.
    // =====================================================
    const INTERACTION_EFFECTS = {
      '1-6': {
        action: '축문을 올린다',
        effect: '정화의 불꽃',
        symbol: '✦'
      },
      '1-9': {
        action: '부적을 매단다',
        effect: '신비한 등불',
        symbol: '✧'
      },
      '1-10': {
        action: '별자리를 살핀다',
        effect: '별빛 제례',
        symbol: '★'
      },
      '2-8': {
        action: '요리를 정돈한다',
        effect: '따끈한 한 끼',
        symbol: '♨'
      },
      '2-7': {
        action: '침구를 정리한다',
        effect: '포근한 텐트',
        symbol: '♪'
      },
      '2-5': {
        action: '차량 내부를 정리한다',
        effect: '깔끔한 캠핑카',
        symbol: '✓'
      },
      '3-9': {
        action: '빛을 장난친다',
        effect: '도깨비불?',
        symbol: '☄'
      },
      '3-10': {
        action: '밤하늘을 들여다본다',
        effect: '수상한 별빛',
        symbol: '☾'
      },
      '3-7': {
        action: '텐트에 숨어든다',
        effect: '으스스한 기척',
        symbol: '…'
      },
      '4-8': {
        action: '재료를 배합한다',
        effect: '보글보글',
        symbol: '⚗'
      },
      '4-6': {
        action: '화력을 조절한다',
        effect: '연금 화염',
        symbol: '✹'
      },
      '4-5': {
        action: '이동 실험실을 꾸민다',
        effect: '실험 장비 가동',
        symbol: '⚙'
      }
    }

    // =====================================================
    // 엔딩 루트
    // =====================================================
    const ENDING_ROUTES = [
      {
        key: 'miko',
        title: '무녀 엔딩',
        subtitle: '별빛 제례 캠프',
        characterId: 1,
        routes: [[1, 6, 9, 10], [1, 9, 6, 10]]
      },
      {
        key: 'maid',
        title: '메이드 엔딩',
        subtitle: '완벽한 글램핑',
        characterId: 2,
        routes: [[2, 8, 7, 5], [2, 7, 8, 5]]
      },
      {
        key: 'ghost',
        title: '유령 엔딩',
        subtitle: '심야의 유령 캠프',
        characterId: 3,
        routes: [[3, 9, 10, 7], [3, 10, 9, 7]]
      },
      {
        key: 'alchemist',
        title: '연금술사 엔딩',
        subtitle: '야외 연금 연구소',
        characterId: 4,
        routes: [[4, 8, 6, 5], [4, 6, 8, 5]]
      }
    ]

    // =====================================================
    // 도감 / 힌트
    // =====================================================
    const BOOK_INFO = [
      {
        key: 'miko',
        realTitle: '무녀 엔딩',
        subtitle: '별빛 제례 캠프',
        hints: [
          '불빛은 누군가에게 단순한 조명이 아닐지도 모른다.',
          '밤하늘을 올려다보기 전에, 불과 빛의 의미를 바꿔보자.'
        ]
      },
      {
        key: 'maid',
        realTitle: '메이드 엔딩',
        subtitle: '완벽한 글램핑',
        hints: [
          '좋은 캠프는 먹고 자는 곳을 제대로 갖추는 데서 시작된다.',
          '정리가 끝난 뒤에는 이동수단조차 훌륭한 생활공간이 될 수 있다.'
        ]
      },
      {
        key: 'ghost',
        realTitle: '유령 엔딩',
        subtitle: '심야의 유령 캠프',
        hints: [
          '밤의 손님에게 빛은 길을 밝히는 것 이상의 의미가 있다.',
          '하늘을 바라본 뒤에도 머물 곳이 있어야 긴 밤을 즐길 수 있다.'
        ]
      },
      {
        key: 'alchemist',
        realTitle: '연금술사 엔딩',
        subtitle: '야외 연금 연구소',
        hints: [
          '불과 그릇만 있다면 야외에서도 실험은 시작될 수 있다.',
          '실험이 커진다면 움직일 수 있는 작업실이 필요할지도 모른다.'
        ]
      },
      {
        key: 'fail',
        realTitle: '실패 엔딩',
        subtitle: '어딘가 어설픈 캠프',
        hints: [
          '모든 물건을 꺼냈다고 해서 캠프가 완성되는 것은 아니다.',
          '누군가와 몇몇 도구 사이의 이야기가 끝까지 이어져야 한다.'
        ]
      },
      {
        key: 'hidden',
        realTitle: 'HIDDEN ENDING',
        subtitle: '늦게 온 해결사',
        hints: [
          '준비가 다 됐는데도 도착하지 않은 캠핑카? 마지막 선택을 캠핑카로 남겨두면 무언가 늦게 도착할지도 모른다.'
        ]
      }
    ]

    const HINT_UNLOCK_ORDER = [
      { key: 'miko', hintIndex: 0 },
      { key: 'maid', hintIndex: 0 },
      { key: 'ghost', hintIndex: 0 },
      { key: 'alchemist', hintIndex: 0 },
      { key: 'fail', hintIndex: 0 },
      { key: 'miko', hintIndex: 1 },
      { key: 'maid', hintIndex: 1 },
      { key: 'ghost', hintIndex: 1 },
      { key: 'alchemist', hintIndex: 1 },
      { key: 'fail', hintIndex: 1 }
    ]

    // =====================================================
    // 개발용 데이터 정합성 검사
    // 상호작용/엔딩/행동 슬롯 오타를 조용히 넘기지 않도록 체크
    // =====================================================
    function validateGameData() {
      const errors = []

      Object.entries(CHARACTER_INTERACTIONS).forEach(
        ([characterIdText, equipmentIds]) => {
          const characterId = Number(characterIdText)

          equipmentIds.forEach(equipmentId => {
            const interactionKey = `${characterId}-${equipmentId}`

            if (!INTERACTION_EFFECTS[interactionKey]) {
              errors.push(
                `INTERACTION_EFFECTS 누락: ${interactionKey}`
              )
            }

            if (!ACTION_SLOTS[equipmentId]) {
              errors.push(
                `ACTION_SLOTS 누락: 장비 ${equipmentId}`
              )
            }
          })
        }
      )

      Object.keys(INTERACTION_EFFECTS).forEach(key => {
        const [characterIdText, equipmentIdText] = key.split('-')
        const characterId = Number(characterIdText)
        const equipmentId = Number(equipmentIdText)
        const allowed = CHARACTER_INTERACTIONS[characterId] || []

        if (!allowed.includes(equipmentId)) {
          errors.push(
            `INTERACTION_EFFECTS 불일치: ${key}가 CHARACTER_INTERACTIONS에 없음`
          )
        }
      })

      ENDING_ROUTES.forEach(ending => {
        const allowed = CHARACTER_INTERACTIONS[ending.characterId] || []

        ending.routes.forEach((route, routeIndex) => {
          if (!route.includes(ending.characterId)) {
            errors.push(
              `${ending.key} route ${routeIndex + 1}: 캐릭터 ${ending.characterId} 누락`
            )
          }

          route
            .filter(id => id >= 5)
            .forEach(equipmentId => {
              if (!allowed.includes(equipmentId)) {
                errors.push(
                  `${ending.key} route ${routeIndex + 1}: ` +
                  `장비 ${equipmentId}는 캐릭터 ${ending.characterId}와 연결되지 않음`
                )
              }
            })
        })
      })

      ITEM_DEFS
        .filter(item => item.type === 'equipment')
        .forEach(item => {
          if (!EQUIPMENT_ASSET_NAMES.includes(item.key)) {
            errors.push(`장비 에셋 이름 누락: ${item.key}`)
          }
        })

      if (errors.length > 0) {
        console.error(
          '[GROW CAMP DATA CHECK]\n' +
          errors.map(error => `- ${error}`).join('\n')
        )
      } else {
        console.info('[GROW CAMP DATA CHECK] OK')
      }
    }

    // =====================================================
    // 예약 / 게임 상태
    // =====================================================
    const actionReservations = new Map()

    let turn = 0
    let gameOver = false
    let bookOpen = false
    let endingOverlay = null
    let bookOverlay = null
    let bottomInputLocked = false
    let bottomUnlockTimer = null
    let actionSequenceToken = 0
    let hiddenSequenceRunning = false
    // 히든 엔딩이 확정된 뒤에는 4명의 *_hidden.png 상태를 엔딩이 끝날 때까지 유지한다.
    // 해제는 장면 자체를 restart해서 새 게임을 시작할 때만 일어난다.
    let hiddenEndingVisualLocked = false
    let endingResetConfirmOpen = false
    let gameConfirmModal = null

    const campItems = []
    const selectionOrder = []

    // 한 번 일반 엔딩 루트가 완성되면 이후 상호작용 연출은
    // 그 엔딩의 주인공 캐릭터 하나만 담당한다.
    // (예: 랜턴에 여러 캐릭터가 연결되어 있어도 동시에 반응하지 않음)
    let confirmedEndingFocus = null

    // =====================================================
    // 시간대 배경 시스템
    // 1~3턴: 낮 / 4~6턴: 석양 / 7~10턴: 밤
    // 전환 시 두 장을 겹쳐 크로스페이드하고 색 오버레이를 넣는다.
    // =====================================================
    const BACKGROUND_TRANSITION_MS = 1800

    function fitBackground(image) {
      const scale = Math.max(
        1920 / image.width,
        1080 / image.height
      )
      image.setScale(scale)
      return scale
    }

    const bgA = scene.add.image(960, 540, 'background_1')
      .setOrigin(0.5)
      .setDepth(-120)
      .setAlpha(1)

    const bgB = scene.add.image(960, 540, 'background_1')
      .setOrigin(0.5)
      .setDepth(-119)
      .setAlpha(0)

    fitBackground(bgA)
    fitBackground(bgB)

    let activeBackground = bgA
    let standbyBackground = bgB
    let currentBackgroundIndex = 1
    let backgroundTransitionToken = 0

    const timeColorOverlay = scene.add.rectangle(
      960,
      540,
      1920,
      1080,
      0xffa45a,
      0
    ).setDepth(-118)

    // 항상 배경 위에만 깔리는 톤 보정 레이어.
    // 월드 오브젝트와 UI보다 아래에 있어서 캐릭터 색은 건드리지 않는다.
    const backgroundToneOverlay = scene.add.rectangle(
      960,
      540,
      1920,
      1080,
      BACKGROUND_TONE_COLOR,
      BACKGROUND_TONE_ALPHA
    ).setDepth(-117)

    function getBackgroundForTurn(turnValue) {
      if (turnValue >= 7) return 3
      if (turnValue >= 4) return 2
      return 1
    }

    function setBackgroundImmediate(index) {
      backgroundTransitionToken += 1
      scene.tweens.killTweensOf([activeBackground, standbyBackground, timeColorOverlay])

      activeBackground.setTexture(`background_${index}`)
      fitBackground(activeBackground)
      activeBackground.setAlpha(1)
      activeBackground.setTint(0xffffff)
      activeBackground.setDepth(-120)

      standbyBackground.setAlpha(0)
      standbyBackground.setTint(0xffffff)
      standbyBackground.setDepth(-119)

      timeColorOverlay.setAlpha(0)
      currentBackgroundIndex = index
    }

    function transitionBackground(index) {
      if (index === currentBackgroundIndex) return

      const token = ++backgroundTransitionToken
      scene.tweens.killTweensOf([activeBackground, standbyBackground, timeColorOverlay])

      standbyBackground.setTexture(`background_${index}`)
      fitBackground(standbyBackground)
      standbyBackground.setAlpha(0)
      standbyBackground.setTint(0xffffff)
      standbyBackground.setDepth(-119)
      activeBackground.setDepth(-120)

      // 낮→석양은 따뜻하게, 석양→밤은 푸르게 한 번 물들인다.
      const overlayColor = index === 2 ? 0xff9b55 : 0x2b438f
      timeColorOverlay.setFillStyle(overlayColor, 1)
      timeColorOverlay.setAlpha(0)

      scene.tweens.add({
        targets: timeColorOverlay,
        alpha: index === 2 ? 0.18 : 0.24,
        duration: BACKGROUND_TRANSITION_MS * 0.45,
        ease: 'Sine.InOut',
        yoyo: true
      })

      scene.tweens.add({
        targets: standbyBackground,
        alpha: 1,
        duration: BACKGROUND_TRANSITION_MS,
        ease: 'Sine.InOut'
      })

      scene.tweens.add({
        targets: activeBackground,
        alpha: 0,
        duration: BACKGROUND_TRANSITION_MS,
        ease: 'Sine.InOut',
        onComplete: () => {
          if (token !== backgroundTransitionToken) return

          const previous = activeBackground
          activeBackground = standbyBackground
          standbyBackground = previous

          activeBackground.setDepth(-120).setAlpha(1)
          standbyBackground.setDepth(-119).setAlpha(0)
          currentBackgroundIndex = index
        }
      })
    }

    function syncBackgroundToTurn(animated = true) {
      const targetIndex = getBackgroundForTurn(turn)
      if (animated) transitionBackground(targetIndex)
      else setBackgroundImmediate(targetIndex)
    }

    scene.add.text(960, 55, 'GROW CAMP', {
      fontSize: '58px',
      color: '#ffffff',
      stroke: '#3d5938',
      strokeThickness: 8
    }).setOrigin(0.5)

    // =====================================================
    // 시스템 버튼
    // RESET / ENDING BOOK - 얇은 테두리 + 반투명 다크 패널
    // =====================================================
    function makeSystemButton(
      x,
      text,
      accentColor,
      width = 150,
      icon = ''
    ) {
      const height = 50
      const radius = 14

      const shadow = scene.add.graphics()
      shadow.fillStyle(0x101813, 0.26)
      shadow.fillRoundedRect(
        -width / 2,
        -height / 2 + 4,
        width,
        height,
        radius
      )

      const panel = scene.add.graphics()
      panel.fillStyle(0x1e2924, 0.88)
      panel.fillRoundedRect(
        -width / 2,
        -height / 2,
        width,
        height,
        radius
      )

      // 은은한 크림색 외곽선
      panel.lineStyle(2, 0xfff0d8, 0.58)
      panel.strokeRoundedRect(
        -width / 2,
        -height / 2,
        width,
        height,
        radius
      )

      // 버튼별 포인트 컬러
      panel.fillStyle(accentColor, 0.95)
      panel.fillRoundedRect(
        -width / 2 + 9,
        -height / 2 + 10,
        4,
        height - 20,
        2
      )

      // 마우스 오버 시 살짝 밝아지는 레이어
      const hoverGlow = scene.add.graphics()
      hoverGlow.fillStyle(0xffffff, 0.12)
      hoverGlow.fillRoundedRect(
        -width / 2 + 2,
        -height / 2 + 2,
        width - 4,
        height - 4,
        radius - 2
      )
      hoverGlow.setAlpha(0)

      const iconText = scene.add.text(
        -width / 2 + 29,
        0,
        icon,
        {
          fontSize: text === 'ENDING BOOK' ? '19px' : '22px',
          color: '#f7dec2',
          fontStyle: 'bold'
        }
      ).setOrigin(0.5)

      const labelX = icon ? 8 : 0
      const label = scene.add.text(
        labelX,
        0,
        text,
        {
          fontSize: text === 'ENDING BOOK' ? '20px' : '21px',
          color: '#fffaf2',
          fontStyle: 'bold',
          letterSpacing: 1
        }
      ).setOrigin(0.5)

      const button = scene.add.container(
        x,
        55,
        [shadow, panel, hoverGlow, iconText, label]
      )
        .setSize(width, height)
        .setInteractive({ useHandCursor: true })
        .setDepth(500)

      button.on('pointerover', () => {
        scene.tweens.killTweensOf(button)
        scene.tweens.killTweensOf(hoverGlow)

        scene.tweens.add({
          targets: button,
          scaleX: 1.035,
          scaleY: 1.035,
          duration: 120,
          ease: 'Sine.Out'
        })

        scene.tweens.add({
          targets: hoverGlow,
          alpha: 1,
          duration: 120,
          ease: 'Sine.Out'
        })
      })

      button.on('pointerout', () => {
        scene.tweens.killTweensOf(button)
        scene.tweens.killTweensOf(hoverGlow)

        scene.tweens.add({
          targets: button,
          scaleX: 1,
          scaleY: 1,
          duration: 140,
          ease: 'Sine.Out'
        })

        scene.tweens.add({
          targets: hoverGlow,
          alpha: 0,
          duration: 140,
          ease: 'Sine.Out'
        })
      })

      button.on('pointerdown', () => {
        scene.tweens.killTweensOf(button)
        scene.tweens.add({
          targets: button,
          scaleX: 0.975,
          scaleY: 0.975,
          duration: 65,
          ease: 'Sine.Out'
        })
      })

      button.on('pointerup', () => {
        scene.tweens.killTweensOf(button)
        scene.tweens.add({
          targets: button,
          scaleX: 1.035,
          scaleY: 1.035,
          duration: 90,
          ease: 'Sine.Out'
        })
      })

      return button
    }

    const resetButton = makeSystemButton(
      105,
      'RESET',
      0xd77b72,
      142,
      '↻'
    )

    const turnText = scene.add.text(1490, 55, 'TURN 0 / 10', {
      fontSize: '30px',
      color: '#ffffff'
    }).setOrigin(0.5).setDepth(500)

    const bookButton = makeSystemButton(
      1745,
      'ENDING BOOK',
      0x9b82c7,
      238,
      '✦'
    )

    const messageText = scene.add.text(
      960,
      750,
      '아래 버튼에서 첫 번째 요소를 선택하세요',
      {
        fontSize: '27px',
        color: '#ffffff',
        stroke: '#3d5938',
        strokeThickness: 5
      }
    ).setOrigin(0.5)

    // =====================================================
    // 월드 오브젝트
    // =====================================================
    function makeWorldObject(def) {
      let x = def.x
      let y = def.y

      if (def.type === 'character') {
        const home = ACTIVE_IDLE_TARGETS[def.id]
        x = home.point.x
        y = home.point.y
      }

      // 캐릭터는 실제 Idle 스프라이트, 장비는 실제 PNG 스프라이트 사용.
      // body는 기존 로직 호환용으로 남기되 캐릭터/장비 모두 숨김.
      const body = scene.add.circle(
        0,
        0,
        def.type === 'character' ? 58 : 72,
        0xd8c9a4
      ).setStrokeStyle(6, 0x70573c)

      let characterShadow = null
      let characterSprite = null
      let equipmentSprite = null

      if (def.type === 'character') {
        const textureKey = `${def.key}_idle`

        // 잔디 위에 붙어 보이도록 발밑에 아주 약한 타원 그림자 추가.
        const shadowY =
          CHARACTER_SHADOW_Y_BY_KEY[def.key] ?? 29

        characterShadow = scene.add.ellipse(
          0,
          shadowY,
          CHARACTER_SHADOW_WIDTH,
          CHARACTER_SHADOW_HEIGHT,
          CHARACTER_SHADOW_COLOR,
          CHARACTER_SHADOW_ALPHA
        )

        characterSprite = scene.add.sprite(
          0,
          12,
          textureKey,
          'idle_0'
        )

        // 컨테이너 좌표를 캐릭터의 "발 위치"처럼 쓰기 위해
        // 중심보다 아래쪽을 원점으로 둔다.
        characterSprite.setOrigin(0.5, 0.88)

        if (characterSprite.height > 0) {
          const scale = CHARACTER_DISPLAY_HEIGHT / characterSprite.height
          characterSprite.setScale(scale)
        }

        // 배경의 따뜻한 낮빛을 아주 약하게 묻힌다.
        characterSprite.setTint(CHARACTER_SCENE_TINT)

        characterSprite.play(`${def.key}_idle_anim`, true)
        body.setVisible(false)
      }

      if (def.type === 'equipment') {
        const spriteConfig = EQUIPMENT_SPRITE_CONFIG[def.key]
        equipmentSprite = scene.add.image(0, 0, `${def.key}_1`)
        equipmentSprite.setAlpha(EQUIPMENT_SPRITE_ALPHA)

        if (spriteConfig && equipmentSprite.width > 0) {
          const ratio = equipmentSprite.height / equipmentSprite.width
          const displayWidth = getEquipmentDisplayWidth(def.key, 1)
          equipmentSprite.setDisplaySize(
            displayWidth,
            displayWidth * ratio
          )
        }

        body.setVisible(false)
      }

      // 방향은 실제 캐릭터 스프라이트 좌우 반전으로 표현.
      // directionText는 기존 로직 호환용이지만 화면에서는 숨긴다.
      const directionText = scene.add.text(
        0,
        -73,
        def.type === 'character' ? '•' : '',
        {
          fontSize: '28px',
          color: '#ffffff',
          stroke: '#333333',
          strokeThickness: 4
        }
      ).setOrigin(0.5)

      const nameText = scene.add.text(0, 38, def.name, {
        fontSize: def.type === 'character' ? '17px' : '22px',
        color: '#ffffff',
        stroke: '#3a2e24',
        strokeThickness: def.type === 'character' ? 4 : 0
      }).setOrigin(0.5)

      const statusText = scene.add.text(
        0,
        def.type === 'character' ? 59 : 30,
        def.type === 'character' ? '대기중' : 'LV.0',
        {
          fontSize: def.type === 'character' ? '17px' : '14px',
          color: def.type === 'character' ? '#7a4c20' : '#f4efe7',
          stroke: def.type === 'character' ? undefined : '#3a2e24',
          strokeThickness: def.type === 'character' ? 0 : 4
        }
      ).setOrigin(0.5)

      if (def.type === 'character') {
        directionText.setVisible(false)
        // 캐릭터 이름은 버튼에도 있으므로 월드에서는 숨겨 화면을 덜 가린다.
        nameText.setVisible(false)
      }

      if (def.type === 'equipment') {
        const spriteConfig = EQUIPMENT_SPRITE_CONFIG[def.key]
        directionText.setVisible(false)
        nameText.setVisible(false)

        if (spriteConfig) {
          statusText.setY(spriteConfig.statusY)
        }
      }

      const children = [
        body,
        ...(characterShadow ? [characterShadow] : []),
        ...(characterSprite ? [characterSprite] : []),
        ...(equipmentSprite ? [equipmentSprite] : []),
        directionText,
        nameText,
        statusText
      ]

      const containerDepth = def.type === 'character' ? 300 : 60
      const container = scene.add.container(x, y, children).setDepth(containerDepth)

      if (def.type === 'equipment') {
        container.setAlpha(0)
        container.setScale(0.2)
      }

      const item = {
        ...def,
        level: 0,
        selected: false,
        facing: 'right',
        body,
        characterShadow,
        characterSprite,
        equipmentSprite,
        directionText,
        nameText,
        statusText,
        container,
        button: null,
        buttonText: null,
        buttonIcon: null,
        buttonSelectedGlow: null,
        wanderRunning: false,
        currentNodeIndex: null,
        nextNodeIndex: null,
        lastNodeIndex: null,
        plannedTarget: null,
        actionReservation: null,
        movementToken: 0,
        atHome: def.type === 'character',
        equipmentTextureStage: def.type === 'equipment' ? 1 : null
      }

      campItems.push(item)
      return item
    }

    ITEM_DEFS.forEach(makeWorldObject)

    function getCharacters() {
      return campItems.filter(item => item.type === 'character')
    }

    function getEquipmentStage(level) {
      if (level <= 0) return 0
      if (level <= 3) return 1
      if (level <= 6) return 2
      return 3
    }

    function getEquipmentScale(level) {
      const stage = getEquipmentStage(level)
      if (stage === 1) return 1
      if (stage === 2) return 1.03
      if (stage === 3) return 1.06
      return 0.2
    }

    function updateEquipmentTexture(item) {
      if (item.type !== 'equipment' || !item.equipmentSprite) return

      const stage = Math.max(1, getEquipmentStage(item.level))
      if (item.equipmentTextureStage === stage) return

      item.equipmentTextureStage = stage
      item.equipmentSprite.setTexture(`${item.key}_${stage}`)

      const spriteConfig = EQUIPMENT_SPRITE_CONFIG[item.key]
      if (spriteConfig && item.equipmentSprite.width > 0) {
        const ratio = item.equipmentSprite.height / item.equipmentSprite.width
        const displayWidth = getEquipmentDisplayWidth(item.key, stage)
        item.equipmentSprite.setDisplaySize(
          displayWidth,
          displayWidth * ratio
        )
      }
    }

    // =====================================================
    // DEBUG 상호작용 슬롯 표시
    // 노란 이동 노드와 연결선은 완전히 제거했다.
    // =====================================================
    if (DEBUG_SHOW_INTERACTION_POINTS) {
      Object.entries(ACTION_SLOTS).forEach(([equipmentId, slots]) => {
        slots.forEach((slot, index) => {
          scene.add.circle(
            slot.point.x,
            slot.point.y,
            11,
            0xff4fa3,
            0.9
          ).setStrokeStyle(3, 0x6a173f).setDepth(45)

          scene.add.text(
            slot.point.x + 14,
            slot.point.y + 5,
            `A${equipmentId}-${index + 1}`,
            {
              fontSize: '14px',
              color: '#ff98c9',
              stroke: '#333333',
              strokeThickness: 3
            }
          ).setDepth(46)
        })
      })

      // 히든 엔딩 전용 4개 집결 노드.
      Object.entries(HIDDEN_ENDING_CHARACTER_NODES).forEach(
        ([characterId, node]) => {
          scene.add.circle(
            node.point.x,
            node.point.y,
            12,
            0x55d7ff,
            0.92
          ).setStrokeStyle(3, 0x164d66).setDepth(47)

          scene.add.text(
            node.point.x + 15,
            node.point.y + 5,
            `H-${characterId}`,
            {
              fontSize: '14px',
              color: '#9eeaff',
              stroke: '#23333a',
              strokeThickness: 3
            }
          ).setDepth(48)
        }
      )
    }

    // =====================================================
    // 하단 입력 잠금
    // =====================================================
    function setBottomInputLocked(locked) {
      bottomInputLocked = locked

      campItems.forEach(item => {
        if (!item.button) return

        if (locked) {
          item.button.disableInteractive()
          item.button.setAlpha(0.55)
          if (item.buttonText) item.buttonText.setAlpha(0.55)
          if (item.buttonIcon) item.buttonIcon.setAlpha(0.55)
          if (item.buttonSelectedGlow) item.buttonSelectedGlow.setAlpha(
            item.selected ? 0.55 : 0
          )
        } else {
          item.button.setInteractive({ useHandCursor: true })
          item.button.setAlpha(1)
          if (item.buttonText) item.buttonText.setAlpha(1)
          if (item.buttonIcon) item.buttonIcon.setAlpha(1)
          if (item.buttonSelectedGlow) item.buttonSelectedGlow.setAlpha(
            item.selected ? 1 : 0
          )
        }
      })
    }

    function clearBottomUnlockTimer() {
      if (!bottomUnlockTimer) return
      bottomUnlockTimer.remove(false)
      bottomUnlockTimer = null
    }

    function finishTurnAfterAction(sequenceToken) {
      if (sequenceToken !== actionSequenceToken) return

      clearBottomUnlockTimer()

      bottomUnlockTimer = scene.time.delayedCall(
        AFTER_ACTION_LOCK_MS,
        () => {
          bottomUnlockTimer = null
          if (sequenceToken !== actionSequenceToken) return

          if (turn === 10) {
            showEnding()
            return
          }

          setBottomInputLocked(false)
          if (!gameOver) messageText.setText('다음 요소를 선택하세요')
        }
      )
    }

    // =====================================================
    // 캐릭터 Idle / 순간이동 공통 처리
    // =====================================================
    function playCharacterIdle(character) {
      if (!character.characterSprite) return

      const sprite = character.characterSprite

      // 히든 엔딩이 한 번 확정되면 일반 idle로 절대 복귀시키지 않는다.
      // 이후 어떤 공통 idle 처리 함수가 호출되더라도 *_hidden.png + 좌우반전 상태를 유지한다.
      if (hiddenEndingVisualLocked) {
        const hiddenTextureKey = `${character.key}_hidden`
        const hiddenTexture = scene.textures.get(hiddenTextureKey)

        if (hiddenTexture && hiddenTexture.key !== '__MISSING') {
          sprite.stop()
          if (sprite.texture?.key !== hiddenTextureKey) {
            sprite.setTexture(hiddenTextureKey)
          }
          sprite.setFlipX(true)
          sprite.setTint(CHARACTER_SCENE_TINT)

          if (sprite.height > 0) {
            const scale = HIDDEN_CHARACTER_HEIGHT / sprite.height
            sprite.setScale(scale)
          }
          return
        }
      }

      const idleTextureKey = `${character.key}_idle`

      if (sprite.texture?.key !== idleTextureKey) {
        sprite.stop()
        sprite.setTexture(idleTextureKey, 'idle_0')

        if (sprite.height > 0) {
          const scale = CHARACTER_DISPLAY_HEIGHT / sprite.height
          sprite.setScale(scale)
        }
      }

      sprite.setFlipX(false)

      const animKey = `${character.key}_idle_anim`
      if (
        sprite.anims.currentAnim?.key !== animKey ||
        !sprite.anims.isPlaying
      ) {
        sprite.play(animKey, true)
      }
    }

    function showHiddenEndingCharacter(character) {
      if (!character.characterSprite) return

      const sprite = character.characterSprite
      const hiddenTextureKey = `${character.key}_hidden`
      const hiddenTexture = scene.textures.get(hiddenTextureKey)

      // 히든 전용 PNG가 누락돼도 시퀀스 전체가 멈추지는 않게 한다.
      if (!hiddenTexture || hiddenTexture.key === '__MISSING') {
        console.warn(`[GROW CAMP] 히든 캐릭터 텍스처 없음: ${hiddenTextureKey}`)
        playCharacterIdle(character)
        sprite.setFlipX(true)
        return
      }

      sprite.stop()
      sprite.setTexture(hiddenTextureKey)
      sprite.setFlipX(true)
      sprite.setTint(CHARACTER_SCENE_TINT)

      // hidden PNG도 기존 캐릭터와 동일한 160px 기준 높이로 맞춘다.
      if (sprite.height > 0) {
        const scale = HIDDEN_CHARACTER_HEIGHT / sprite.height
        sprite.setScale(scale)
      }
    }

    function releaseActionReservation(character) {
      const reservation = character.actionReservation
      if (!reservation) return

      if (actionReservations.get(reservation.key) === character.id) {
        actionReservations.delete(reservation.key)
      }
      character.actionReservation = null
    }

    function clearAllReservations() {
      actionReservations.clear()
      getCharacters().forEach(character => {
        character.actionReservation = null
      })
    }

    function cancelCharacterMovement(character) {
      character.movementToken += 1
      scene.tweens.killTweensOf(character.container)
      character.plannedTarget = null
      character.wanderRunning = false
      character.container.setAlpha(1)
      character.container.setScale(1)
      playCharacterIdle(character)
    }

    function setCharacterIdle(character) {
      character.wanderRunning = false
      character.atHome = true
      character.currentNodeIndex = null
      character.nextNodeIndex = null
      character.plannedTarget = null
      character.directionText.setText('•')
      playCharacterIdle(character)
      character.statusText.setText(character.selected ? 'ACTIVE' : '대기중')
    }

    function isCharacterAtHome(character) {
      const home = ACTIVE_IDLE_TARGETS[character.id].point
      return Phaser.Math.Distance.Between(
        character.container.x,
        character.container.y,
        home.x,
        home.y
      ) < 6
    }

    function returnCharacterHome(character, onComplete) {
      releaseActionReservation(character)
      const home = ACTIVE_IDLE_TARGETS[character.id].point

      if (isCharacterAtHome(character)) {
        setCharacterIdle(character)
        onComplete(true)
        return
      }

      character.atHome = false
      character.statusText.setText('복귀중')
      teleportCharacterToPoint(character, home, success => {
        if (success) setCharacterIdle(character)
        onComplete(success)
      })
    }

    function returnCharactersHome(characters, onComplete) {
      const uniqueCharacters = [...new Map(
        characters.map(character => [character.id, character])
      ).values()]

      if (uniqueCharacters.length === 0) {
        onComplete()
        return
      }

      let finished = 0
      uniqueCharacters.forEach(character => {
        returnCharacterHome(character, () => {
          finished += 1
          if (finished >= uniqueCharacters.length) onComplete()
        })
      })
    }

    function getPostActionIdlePoint(character, equipment) {
      return (
        POST_ACTION_IDLE_POINTS[`${equipment.id}-${character.id}`] ||
        ACTIVE_IDLE_TARGETS[character.id].point
      )
    }

    function parkCharacterNearEquipment(character, equipment, onComplete) {
      releaseActionReservation(character)
      const point = getPostActionIdlePoint(character, equipment)
      character.atHome = false
      teleportCharacterToPoint(character, point, success => {
        character.statusText.setText(character.selected ? 'ACTIVE' : '대기중')
        onComplete(success)
      })
    }

    function parkCharactersNearEquipment(characters, equipment, onComplete) {
      const uniqueCharacters = [...new Map(
        characters.map(character => [character.id, character])
      ).values()]

      if (uniqueCharacters.length === 0) {
        onComplete()
        return
      }

      let finished = 0
      uniqueCharacters.forEach(character => {
        parkCharacterNearEquipment(character, equipment, () => {
          finished += 1
          if (finished >= uniqueCharacters.length) onComplete()
        })
      })
    }

    function isInteractionPointOccupied(point, character) {
      return getCharacters().some(other => {
        if (other.id === character.id) return false
        return Phaser.Math.Distance.Between(
          point.x,
          point.y,
          other.container.x,
          other.container.y
        ) < 65
      })
    }

    // =====================================================
    // 행동 슬롯
    // =====================================================
    function reserveActionSlot(character, equipmentId) {
      releaseActionReservation(character)

      const slots = ACTION_SLOTS[equipmentId]
      if (!slots || slots.length === 0) return null

      // 1순위: 예약되지 않았고 현재 다른 캐릭터가 서 있지 않은 자리
      let slotIndex = slots.findIndex((slot, index) => {
        const key = `${equipmentId}-${index}`
        if (actionReservations.has(key)) return false
        return !isInteractionPointOccupied(slot.point, character)
      })

      // 2순위: 동시에 몰렸을 때는 예약만 안 된 자리면 허용
      // 4개 슬롯이 있으므로 현재 상호작용 구조에서는 사실상 이 단계까지 거의 오지 않는다.
      if (slotIndex === -1) {
        slotIndex = slots.findIndex((slot, index) => {
          const key = `${equipmentId}-${index}`
          return !actionReservations.has(key)
        })
      }

      if (slotIndex === -1) return null

      const key = `${equipmentId}-${slotIndex}`
      actionReservations.set(key, character.id)
      character.actionReservation = { key, equipmentId, slotIndex }
      return slots[slotIndex]
    }

    // =====================================================
    // 공통 코드 연출
    // =====================================================
    function showFloatingText(x, y, text, style = {}) {
      const label = scene.add.text(x, y, text, {
        fontSize: style.fontSize || '26px',
        color: style.color || '#ffffff',
        stroke: style.stroke || '#333333',
        strokeThickness: style.strokeThickness ?? 5,
        align: 'center'
      }).setOrigin(0.5).setDepth(style.depth || 900)

      scene.tweens.add({
        targets: label,
        y: y - (style.rise || 36),
        alpha: 0,
        duration: style.duration || 900,
        ease: 'Sine.Out',
        onComplete: () => label.destroy()
      })

      return label
    }

    function showCharacterReaction(character) {
      showFloatingText(
        character.container.x,
        character.container.y - 85,
        '!',
        {
          fontSize: '40px',
          color: '#ffffff',
          duration: 700,
          rise: 28
        }
      )
    }

    function showInteractionEffect(equipment, interaction) {
      const symbol = interaction?.symbol || '✦'
      const effect = interaction?.effect || '반응!'

      showFloatingText(
        equipment.container.x,
        equipment.container.y - 100,
        `${symbol} ${effect} ${symbol}`,
        {
          fontSize: '25px',
          color: '#fff4b8',
          duration: 1050,
          rise: 42
        }
      )

      for (let i = 0; i < 6; i++) {
        const angle = Phaser.Math.FloatBetween(0, Math.PI * 2)
        const distance = Phaser.Math.Between(45, 90)
        const dot = scene.add.circle(
          equipment.container.x,
          equipment.container.y,
          Phaser.Math.Between(4, 8),
          0xffed9b,
          0.9
        ).setDepth(120)

        scene.tweens.add({
          targets: dot,
          x: equipment.container.x + Math.cos(angle) * distance,
          y: equipment.container.y + Math.sin(angle) * distance,
          alpha: 0,
          duration: Phaser.Math.Between(500, 800),
          ease: 'Sine.Out',
          onComplete: () => dot.destroy()
        })
      }
    }

    // =====================================================
    // 캐릭터별 상호작용 파티클
    // 외부 이미지 에셋 없이 Phaser 도형만 사용.
    // 장비별로 같은 캐릭터라도 움직임/색을 조금씩 다르게 준다.
    // =====================================================
    function spawnParticleDot(x, y, radius, color, alpha = 1, depth = 520) {
      return scene.add.circle(x, y, radius, color, alpha).setDepth(depth)
    }

    function spawnParticleRect(x, y, width, height, color, alpha = 1, depth = 520) {
      return scene.add.rectangle(x, y, width, height, color, alpha).setDepth(depth)
    }

    function tweenParticle(particle, config = {}) {
      scene.tweens.add({
        targets: particle,
        x: config.x ?? particle.x,
        y: config.y ?? particle.y - 40,
        alpha: 0,
        scaleX: config.scaleX ?? 0.25,
        scaleY: config.scaleY ?? 0.25,
        angle: config.angle ?? 0,
        duration: config.duration ?? 750,
        delay: config.delay ?? 0,
        ease: config.ease || 'Sine.Out',
        onComplete: () => particle.destroy()
      })
    }

    function spawnMikoParticles(character, equipment) {
      const cx = equipment.container.x
      const cy = equipment.container.y - 8

      if (equipment.id === 6) {
        // 캠프파이어: 정화의 불씨가 위로 흩날림
        for (let i = 0; i < 11; i++) {
          const p = spawnParticleDot(
            cx + Phaser.Math.Between(-34, 34),
            cy + Phaser.Math.Between(-5, 18),
            Phaser.Math.Between(3, 6),
            i % 3 === 0 ? 0xffffff : 0xffd76a,
            0.95
          )
          tweenParticle(p, {
            x: p.x + Phaser.Math.Between(-28, 28),
            y: p.y - Phaser.Math.Between(60, 120),
            duration: Phaser.Math.Between(620, 980),
            delay: i * 28
          })
        }
      } else if (equipment.id === 9) {
        // 랜턴: 작은 부적 조각과 금빛 점이 둥글게 퍼짐
        for (let i = 0; i < 10; i++) {
          const a = (Math.PI * 2 * i) / 10
          const isCharm = i % 3 === 0
          const p = isCharm
            ? spawnParticleRect(cx, cy, 5, 13, 0xe85a5a, 0.95)
            : spawnParticleDot(cx, cy, 4, 0xffe990, 0.95)
          tweenParticle(p, {
            x: cx + Math.cos(a) * Phaser.Math.Between(55, 85),
            y: cy + Math.sin(a) * Phaser.Math.Between(35, 65),
            angle: isCharm ? Phaser.Math.Between(-55, 55) : 0,
            duration: 820 + i * 25
          })
        }
      } else {
        // 망원경: 별빛이 방사형으로 터짐
        for (let i = 0; i < 12; i++) {
          const a = (Math.PI * 2 * i) / 12
          const p = spawnParticleDot(cx, cy - 20, i % 2 ? 3 : 5, 0xffef9f, 1)
          tweenParticle(p, {
            x: cx + Math.cos(a) * 95,
            y: cy - 20 + Math.sin(a) * 72,
            duration: 720 + i * 18
          })
        }
      }
    }

    function spawnMaidParticles(character, equipment) {
      const cx = equipment.container.x
      const cy = equipment.container.y - 8

      if (equipment.id === 8) {
        // 조리도구: 따뜻한 김 + 반짝임
        for (let i = 0; i < 8; i++) {
          const p = spawnParticleDot(
            cx + Phaser.Math.Between(-38, 38),
            cy + Phaser.Math.Between(-2, 15),
            Phaser.Math.Between(5, 9),
            0xfff5d6,
            0.55
          )
          tweenParticle(p, {
            x: p.x + Phaser.Math.Between(-18, 18),
            y: p.y - Phaser.Math.Between(55, 95),
            scaleX: 1.8,
            scaleY: 1.8,
            duration: Phaser.Math.Between(800, 1100),
            delay: i * 45
          })
        }
      } else if (equipment.id === 7) {
        // 텐트: 포근한 먼지/솜방울 느낌
        for (let i = 0; i < 11; i++) {
          const p = spawnParticleDot(
            cx + Phaser.Math.Between(-28, 28),
            cy,
            Phaser.Math.Between(4, 8),
            i % 2 ? 0xffe7b0 : 0xffffff,
            0.85
          )
          tweenParticle(p, {
            x: cx + Phaser.Math.Between(-90, 90),
            y: cy - Phaser.Math.Between(20, 70),
            scaleX: 1.25,
            scaleY: 1.25,
            duration: Phaser.Math.Between(650, 900),
            delay: i * 30
          })
        }
      } else {
        // 캠핑카: 청소한 듯한 사선 반짝임
        for (let i = 0; i < 9; i++) {
          const p = spawnParticleRect(
            cx + Phaser.Math.Between(-65, 65),
            cy + Phaser.Math.Between(-45, 30),
            4,
            Phaser.Math.Between(10, 18),
            0xfff2b8,
            0.95
          )
          p.setAngle(45)
          tweenParticle(p, {
            x: p.x + 32,
            y: p.y - 32,
            angle: 135,
            duration: Phaser.Math.Between(480, 760),
            delay: i * 35
          })
        }
      }
    }

    function spawnGhostParticles(character, equipment) {
      const cx = equipment.container.x
      const cy = equipment.container.y - 4

      if (equipment.id === 9) {
        // 랜턴: 도깨비불이 좌우로 흩어짐
        for (let i = 0; i < 10; i++) {
          const p = spawnParticleDot(
            cx + Phaser.Math.Between(-24, 24),
            cy + Phaser.Math.Between(-5, 20),
            Phaser.Math.Between(5, 9),
            i % 2 ? 0x7de7ff : 0xb69cff,
            0.82
          )
          tweenParticle(p, {
            x: p.x + Phaser.Math.Between(-80, 80),
            y: p.y - Phaser.Math.Between(55, 105),
            scaleX: 1.4,
            scaleY: 0.35,
            duration: Phaser.Math.Between(760, 1120),
            delay: i * 35,
            ease: 'Sine.InOut'
          })
        }
      } else if (equipment.id === 10) {
        // 망원경: 달빛 같은 푸른 점이 천천히 상승
        for (let i = 0; i < 12; i++) {
          const a = Phaser.Math.FloatBetween(0, Math.PI * 2)
          const p = spawnParticleDot(cx, cy - 15, Phaser.Math.Between(3, 6), 0xb8d6ff, 0.88)
          tweenParticle(p, {
            x: cx + Math.cos(a) * Phaser.Math.Between(45, 105),
            y: cy - Phaser.Math.Between(45, 115),
            duration: Phaser.Math.Between(800, 1150),
            delay: i * 26
          })
        }
      } else {
        // 텐트: 바닥에서 으스스한 기운이 스며나옴
        for (let i = 0; i < 9; i++) {
          const p = spawnParticleDot(
            cx + Phaser.Math.Between(-70, 70),
            cy + 28,
            Phaser.Math.Between(6, 11),
            i % 2 ? 0x85f0df : 0x8b79d9,
            0.5
          )
          tweenParticle(p, {
            x: p.x + Phaser.Math.Between(-18, 18),
            y: p.y - Phaser.Math.Between(35, 70),
            scaleX: 1.7,
            scaleY: 0.45,
            duration: Phaser.Math.Between(900, 1250),
            delay: i * 50
          })
        }
      }
    }

    function spawnAlchemistParticles(character, equipment) {
      const cx = equipment.container.x
      const cy = equipment.container.y - 4
      const colors = [0x7df7bb, 0x79c7ff, 0xd493ff, 0xffd16d]

      if (equipment.id === 8) {
        // 조리도구: 연금 거품이 보글보글 올라옴
        for (let i = 0; i < 12; i++) {
          const color = colors[i % colors.length]
          const p = spawnParticleDot(
            cx + Phaser.Math.Between(-35, 35),
            cy + Phaser.Math.Between(-2, 20),
            Phaser.Math.Between(4, 9),
            color,
            0.72
          )
          tweenParticle(p, {
            x: p.x + Phaser.Math.Between(-24, 24),
            y: p.y - Phaser.Math.Between(55, 110),
            scaleX: 1.45,
            scaleY: 1.45,
            duration: Phaser.Math.Between(760, 1080),
            delay: i * 32
          })
        }
      } else if (equipment.id === 6) {
        // 캠프파이어: 일반 불꽃 사이에 이색 연금 스파크
        for (let i = 0; i < 13; i++) {
          const a = Phaser.Math.FloatBetween(-Math.PI * 0.9, -Math.PI * 0.1)
          const p = spawnParticleRect(cx, cy, 5, 10, colors[i % colors.length], 0.95)
          tweenParticle(p, {
            x: cx + Math.cos(a) * Phaser.Math.Between(55, 100),
            y: cy + Math.sin(a) * Phaser.Math.Between(55, 100),
            angle: Phaser.Math.Between(-140, 140),
            duration: Phaser.Math.Between(520, 860),
            delay: i * 24
          })
        }
      } else {
        // 캠핑카: 이동 실험실 가동 - 색 점이 장비 주위를 원형으로 분산
        for (let i = 0; i < 12; i++) {
          const a = (Math.PI * 2 * i) / 12
          const p = spawnParticleDot(cx, cy, i % 3 === 0 ? 6 : 4, colors[i % colors.length], 0.9)
          tweenParticle(p, {
            x: cx + Math.cos(a) * Phaser.Math.Between(65, 105),
            y: cy + Math.sin(a) * Phaser.Math.Between(40, 75),
            duration: 720 + i * 22
          })
        }
      }
    }

    function spawnCharacterInteractionParticles(character, equipment) {
      if (!character || !equipment) return

      switch (character.id) {
        case 1:
          spawnMikoParticles(character, equipment)
          break
        case 2:
          spawnMaidParticles(character, equipment)
          break
        case 3:
          spawnGhostParticles(character, equipment)
          break
        case 4:
          spawnAlchemistParticles(character, equipment)
          break
      }
    }

    function pulseEquipment(equipment, onComplete = null) {
      const baseScale = getEquipmentScale(equipment.level)

      scene.tweens.add({
        targets: equipment.container,
        scaleX: baseScale * 1.12,
        scaleY: baseScale * 1.12,
        duration: 180,
        yoyo: true,
        repeat: 1,
        ease: 'Sine.InOut',
        onComplete: () => {
          equipment.container.setScale(baseScale)
          if (onComplete) onComplete()
        }
      })
    }

    function playStageUpEffects(items, onComplete) {
      if (items.length === 0) {
        onComplete()
        return
      }

      items.forEach(item => {
        const stage = getEquipmentStage(item.level)
        const baseScale = getEquipmentScale(item.level)

        showFloatingText(
          item.container.x,
          item.container.y - 100,
          `STAGE ${stage}!`,
          {
            fontSize: '24px',
            color: '#ffe083',
            duration: 850,
            rise: 34
          }
        )

        scene.tweens.add({
          targets: item.container,
          scaleX: baseScale * 1.14,
          scaleY: baseScale * 1.14,
          duration: 180,
          yoyo: true,
          repeat: 1,
          ease: 'Back.Out',
          onComplete: () => item.container.setScale(baseScale)
        })
      })

      scene.time.delayedCall(650, onComplete)
    }

    function runInteractionPresentation(character, equipment, onComplete) {
      const interaction = INTERACTION_EFFECTS[`${character.id}-${equipment.id}`]
      const actionName = interaction?.action || `${equipment.name} 사용`

      character.statusText.setText(actionName)

      // 임시 Action 애니메이션: 살짝 위아래로 움직임
      scene.tweens.add({
        targets: character.container,
        y: character.container.y - 8,
        duration: 170,
        yoyo: true,
        repeat: 2,
        ease: 'Sine.InOut',
        onComplete: () => {
          pulseEquipment(equipment)
          showInteractionEffect(equipment, interaction)
          spawnCharacterInteractionParticles(character, equipment)

          scene.time.delayedCall(300, () => {
            showCharacterReaction(character)
            character.statusText.setText('ACTIVE')
            onComplete()
          })
        }
      })
    }

    function runSequentialInteractions(entries, index, onComplete) {
      if (index >= entries.length) {
        onComplete()
        return
      }

      const entry = entries[index]
      runInteractionPresentation(
        entry.character,
        entry.equipment,
        () => {
          scene.time.delayedCall(180, () => {
            runSequentialInteractions(entries, index + 1, onComplete)
          })
        }
      )
    }

    function playEquipmentSoloReaction(equipment, onComplete) {
      pulseEquipment(equipment)
      showFloatingText(
        equipment.container.x,
        equipment.container.y - 95,
        '설치 완료',
        {
          fontSize: '24px',
          color: '#fff4b8',
          duration: 850,
          rise: 34
        }
      )

      scene.time.delayedCall(650, onComplete)
    }

    // =====================================================
    // 캐릭터 이동 → 장비 상호작용
    // =====================================================
    // =====================================================
    // 순간이동 이동 방식
    // 달리기/노드 경로 충돌 때문에 상호작용이 누락되는 문제를 제거한다.
    // 캐릭터는 짧게 사라졌다가 행동 슬롯에 나타난다.
    // =====================================================
    function teleportCharacterToPoint(character, point, onComplete) {
      cancelCharacterMovement(character)

      character.atHome = false
      character.statusText.setText('이동중')
      character.directionText.setText('✦')

      // 출발 위치에 작은 순간이동 효과
      const startFlash = scene.add.circle(
        character.container.x,
        character.container.y - 26,
        18,
        0xffef9a,
        0.75
      ).setDepth(295)

      scene.tweens.add({
        targets: startFlash,
        scale: 2.0,
        alpha: 0,
        duration: 180,
        ease: 'Sine.Out',
        onComplete: () => startFlash.destroy()
      })

      scene.tweens.add({
        targets: character.container,
        alpha: 0,
        scaleX: character.container.scaleX * 0.9,
        scaleY: character.container.scaleY * 0.9,
        duration: 130,
        ease: 'Sine.In',
        onComplete: () => {
          character.container.setPosition(point.x, point.y)
          character.currentNodeIndex = null
          character.nextNodeIndex = null
          character.plannedTarget = null

          const endFlash = scene.add.circle(
            point.x,
            point.y - 26,
            20,
            0xffef9a,
            0.85
          ).setDepth(295)

          scene.tweens.add({
            targets: endFlash,
            scale: 2.2,
            alpha: 0,
            duration: 220,
            ease: 'Sine.Out',
            onComplete: () => endFlash.destroy()
          })

          scene.tweens.add({
            targets: character.container,
            alpha: 1,
            scaleX: 1,
            scaleY: 1,
            duration: 150,
            ease: 'Back.Out',
            onComplete: () => {
              character.directionText.setText('•')
              playCharacterIdle(character)
              onComplete(true)
            }
          })
        }
      })
    }

    function moveCharacterToActionSlot(character, equipment, onArrived) {
      const slot = reserveActionSlot(character, equipment.id)
      if (!slot) {
        onArrived(false)
        return
      }

      teleportCharacterToPoint(character, slot.point, success => {
        if (!success) {
          releaseActionReservation(character)
          onArrived(false)
          return
        }

        character.statusText.setText('준비')
        onArrived(true)
      })
    }

    function runEquipmentInteractionTurn(equipment, onComplete) {
      let interestedCharacters = getCharacters().filter(character => {
        if (!character.selected) return false
        const interactions = CHARACTER_INTERACTIONS[character.id] || []
        return interactions.includes(equipment.id)
      })

      // 일반 엔딩 루트가 확정된 뒤에는 그 루트의 주인공만 연출한다.
      // 루트와 무관한 캐릭터가 같은 장비(특히 랜턴)에 동시에 달라붙는 현상을 막는다.
      if (confirmedEndingFocus) {
        interestedCharacters = interestedCharacters.filter(
          character => character.id === confirmedEndingFocus.characterId
        )
      }

      if (interestedCharacters.length === 0) {
        playEquipmentSoloReaction(equipment, onComplete)
        return
      }

      let finishedMoves = 0
      const readyEntries = []

      interestedCharacters.forEach(character => {
        moveCharacterToActionSlot(character, equipment, success => {
          if (success) {
            readyEntries.push({ character, equipment })
          }

          finishedMoves += 1

          if (finishedMoves >= interestedCharacters.length) {
            if (readyEntries.length === 0) {
              playEquipmentSoloReaction(equipment, onComplete)
              return
            }

            runSequentialInteractions(readyEntries, 0, () => {
              parkCharactersNearEquipment(
                interestedCharacters,
                equipment,
                onComplete
              )
            })
          }
        })
      })
    }

    function findLatestSelectedRelatedEquipment(character) {
      const related = CHARACTER_INTERACTIONS[character.id] || []
      const selectedRelated = selectionOrder.filter(id => related.includes(id))
      if (selectedRelated.length === 0) return null

      const latestId = selectedRelated[selectedRelated.length - 1]
      return campItems.find(item => item.id === latestId) || null
    }

    // =====================================================
    // 캐릭터 활성화
    // 기본 상태는 자기 자리 Idle.
    // 이미 관련 장비가 있으면 바로 장비로 이동해 상호작용 후 그 주변에서 대기.
    // =====================================================
    function activateCharacter(character, onComplete) {
      cancelCharacterMovement(character)
      releaseActionReservation(character)

      character.selected = true
      character.statusText.setText('ACTIVE')

      const relatedEquipment = findLatestSelectedRelatedEquipment(character)

      // 관련 장비가 아직 없으면 자기 자리에서 활성화 연출만.
      if (!relatedEquipment) {
        setCharacterIdle(character)
        showCharacterReaction(character)
        onComplete()
        return
      }

      character.atHome = false

      moveCharacterToActionSlot(character, relatedEquipment, moved => {
        if (!moved) {
          returnCharacterHome(character, () => {
            showCharacterReaction(character)
            onComplete()
          })
          return
        }

        runInteractionPresentation(
          character,
          relatedEquipment,
          () => {
            parkCharacterNearEquipment(
              character,
              relatedEquipment,
              () => onComplete()
            )
          }
        )
      })
    }

    // =====================================================
    // 하단 2 × 5 UI
    // =====================================================
    scene.add.rectangle(960, 930, 1920, 300, 0x29352b)
      .setStrokeStyle(6, 0x182019)
      .setDepth(200)

    const columns = [200, 580, 960, 1340, 1720]
    const row1 = 865
    const row2 = 980

    function makeItemButton(x, y, item) {
      const button = scene.add.rectangle(x, y, 300, 88, 0x26322a)
        .setStrokeStyle(3, 0xf1dfbd)
        .setInteractive({ useHandCursor: true })
        .setDepth(210)

      const icon = scene.add.image(x, y, `ui_${item.key}`)
        .setDepth(211)

      const selectedGlow = scene.add.circle(
        x + 124,
        y - 31,
        7,
        0xffd66b,
        0
      ).setDepth(212)

      item.buttonSelectedGlow = selectedGlow

      if (icon.width > 0 && icon.height > 0) {
        const maxSize = 74
        const iconScale = Math.min(
          maxSize / icon.width,
          maxSize / icon.height
        )
        icon.setScale(iconScale)
      }

      item.button = button
      item.buttonText = null
      item.buttonIcon = icon
      item.buttonSelectedGlow = selectedGlow

      button.on('pointerdown', () => selectItem(item))

      button.on('pointerover', () => {
        if (bottomInputLocked) return
        button.setScale(1.035)
        icon.setScale(icon.scaleX * 1.035, icon.scaleY * 1.035)
      })

      button.on('pointerout', () => {
        button.setScale(1)

        if (icon.width > 0 && icon.height > 0) {
          const maxSize = 74
          const iconScale = Math.min(
            maxSize / icon.width,
            maxSize / icon.height
          )
          icon.setScale(iconScale)
        }
      })
    }

    for (let i = 0; i < 5; i++) {
      makeItemButton(columns[i], row1, campItems[i])
      makeItemButton(columns[i], row2, campItems[i + 5])
    }

    // =====================================================
    // 화면 갱신
    // =====================================================
    function refreshVisuals() {
      turnText.setText(`TURN ${turn} / 10`)

      campItems.forEach(item => {
        if (item.type === 'character') {
          if (item.characterSprite) {
            item.characterSprite.setAlpha(item.selected ? 1 : 0.94)
          }
        } else {
          const stage = getEquipmentStage(item.level)

          if (!item.selected) {
            item.container.setAlpha(0)
            item.container.setScale(0.2)
          } else {
            updateEquipmentTexture(item)
            item.container.setAlpha(1)
            item.container.setScale(getEquipmentScale(item.level))
            item.statusText.setText(`LV.${item.level} / STAGE ${stage}`)
          }
        }

        if (item.button) {
          item.button.setFillStyle(item.selected ? 0x66583b : 0x26322a)
          item.button.setStrokeStyle(
            item.selected ? 5 : 3,
            item.selected ? 0xffe6a3 : 0xf1dfbd
          )

          if (item.buttonSelectedGlow) {
            item.buttonSelectedGlow.setAlpha(item.selected ? 1 : 0)
          }
        }
      })
    }


    // =====================================================
    // 엔딩 판정
    // =====================================================
    function routeCompletionTurn(order, route) {
      let routeIndex = 0

      for (let i = 0; i < order.length; i++) {
        if (order[i] === route[routeIndex]) {
          routeIndex += 1
          if (routeIndex === route.length) return i + 1
        }
      }

      return null
    }

    function getConfirmedNormalEnding(order = selectionOrder) {
      const candidates = []

      ENDING_ROUTES.forEach(ending => {
        ending.routes.forEach((route, routeIndex) => {
          const completionTurn = routeCompletionTurn(order, route)
          if (completionTurn === null) return

          candidates.push({
            ...ending,
            routeIndex,
            completionTurn,
            characterTurn: order.indexOf(ending.characterId) + 1
          })
        })
      })

      if (candidates.length === 0) return null

      candidates.sort((a, b) => {
        if (a.completionTurn !== b.completionTurn) {
          return a.completionTurn - b.completionTurn
        }
        return a.characterTurn - b.characterTurn
      })

      return candidates[0]
    }

    function getRouteProgress(order, route) {
      let routeIndex = 0

      for (let i = 0; i < order.length && routeIndex < route.length; i++) {
        if (order[i] === route[routeIndex]) {
          routeIndex += 1
        }
      }

      // 이미 선택된 항목은 다시 고를 수 없으므로,
      // 아직 남아 있는 루트 요소가 앞에서 잘못 소비되었다면 이 루트는 더 이상 완성 불가.
      const remaining = route.slice(routeIndex)
      const stillPossible = remaining.every(id => !order.includes(id))

      return {
        progress: routeIndex,
        stillPossible
      }
    }

    function getPotentialEndingFocus(order = selectionOrder) {
      const candidates = []

      ENDING_ROUTES.forEach(ending => {
        const characterTurn = order.indexOf(ending.characterId) + 1
        if (characterTurn <= 0) return

        let bestProgress = 0
        let hasPossibleRoute = false

        ending.routes.forEach(route => {
          const info = getRouteProgress(order, route)
          if (!info.stillPossible) return

          hasPossibleRoute = true
          bestProgress = Math.max(bestProgress, info.progress)
        })

        if (!hasPossibleRoute || bestProgress < 2) return

        candidates.push({
          type: ending.key,
          characterId: ending.characterId,
          progress: bestProgress,
          characterTurn
        })
      })

      if (candidates.length === 0) return null

      candidates.sort((a, b) => {
        if (a.progress !== b.progress) return b.progress - a.progress
        return a.characterTurn - b.characterTurn
      })

      const best = candidates[0]
      const second = candidates[1]

      // 완성 전에는 "확실히 앞선" 루트만 잠근다.
      // 동률이면 아직 확정으로 보지 않아 플레이어 선택 여지를 남긴다.
      if (second && second.progress === best.progress) return null

      return best
    }

    function refreshConfirmedEndingFocus() {
      // 한 번 루트 포커스가 확정되면 일반 진행 중에는 바꾸지 않는다.
      if (confirmedEndingFocus) return

      const winner = getConfirmedNormalEnding(selectionOrder)

      if (winner) {
        confirmedEndingFocus = {
          type: winner.key,
          characterId: winner.characterId,
          completionTurn: winner.completionTurn,
          lockedBy: 'completed'
        }
        return
      }

      const potential = getPotentialEndingFocus(selectionOrder)
      confirmedEndingFocus = potential
        ? {
            ...potential,
            completionTurn: null,
            lockedBy: 'progress'
          }
        : null
    }

    function resolveEnding() {
      if (selectionOrder.length === 10 && selectionOrder[9] === 5) {
        return {
          type: 'hidden',
          title: 'HIDDEN ENDING',
          subtitle: '늦게 온 해결사',
          reason: '마지막 순간, 예상하지 못한 손님이 캠프에 도착했다.'
        }
      }

      const candidates = []

      ENDING_ROUTES.forEach(ending => {
        ending.routes.forEach((route, routeIndex) => {
          const completionTurn = routeCompletionTurn(selectionOrder, route)

          if (completionTurn !== null) {
            candidates.push({
              ...ending,
              routeIndex,
              completionTurn,
              characterTurn: selectionOrder.indexOf(ending.characterId) + 1
            })
          }
        })
      })

      if (candidates.length === 0) {
        return {
          type: 'fail',
          title: 'FAILED ENDING',
          subtitle: '어딘가 어설픈 캠프',
          reason: '캠프는 끝내 하나의 이야기로 이어지지 못했다.'
        }
      }

      candidates.sort((a, b) => {
        if (a.completionTurn !== b.completionTurn) {
          return a.completionTurn - b.completionTurn
        }

        return a.characterTurn - b.characterTurn
      })

      const winner = candidates[0]

      return {
        type: winner.key,
        title: winner.title,
        subtitle: winner.subtitle,
        reason: '캠프의 선택들이 하나의 특별한 결말로 이어졌다.'
      }
    }

    function unlockEnding(endingKey) {
      const isNew = !progress.endings[endingKey]

      if (isNew) {
        progress.endings[endingKey] = true
        saveProgress()
      }

      return isNew
    }

    function getUnlockedHints(endingKey) {
      const result = []
      const maxUnlocks = Math.min(
        progress.resetCount,
        HINT_UNLOCK_ORDER.length
      )

      for (let i = 0; i < maxUnlocks; i++) {
        const unlock = HINT_UNLOCK_ORDER[i]
        if (unlock.key === endingKey) result.push(unlock.hintIndex)
      }

      return result
    }

    function normalFiveComplete() {
      return (
        progress.endings.miko &&
        progress.endings.maid &&
        progress.endings.ghost &&
        progress.endings.alchemist &&
        progress.endings.fail
      )
    }

    function showUnlockToast(ending) {
      const box = scene.add.rectangle(
        960,
        170,
        700,
        120,
        0x332b40,
        0.96
      ).setStrokeStyle(5, 0xffdf82)

      const text = scene.add.text(
        960,
        170,
        `NEW ENDING UNLOCKED!\n${ending.title}`,
        {
          fontSize: '28px',
          color: '#ffffff',
          align: 'center'
        }
      ).setOrigin(0.5)

      const toast = scene.add.container(0, 0, [box, text])
        .setDepth(1500)
        .setAlpha(0)

      scene.tweens.add({
        targets: toast,
        alpha: 1,
        duration: 250,
        onComplete: () => {
          scene.time.delayedCall(1800, () => {
            scene.tweens.add({
              targets: toast,
              alpha: 0,
              duration: 300,
              onComplete: () => toast.destroy(true)
            })
          })
        }
      })
    }

    // =====================================================
    // 엔딩 도감
    // =====================================================
    function closeEndingBook() {
      if (bookOverlay) {
        bookOverlay.destroy(true)
        bookOverlay = null
      }
      bookOpen = false
    }

    function openEndingBook() {
      if (bookOpen) {
        closeEndingBook()
        return
      }

      bookOpen = true
      const objects = []

      const discoveredCount = Object.values(progress.endings).filter(Boolean).length
      const hintCount = Math.min(progress.resetCount, 10)

      const shade = scene.add.rectangle(
        960,
        540,
        1920,
        1080,
        0x09110d,
        0.82
      ).setInteractive()
      objects.push(shade)

      // 엔딩북 배경 에셋.
      // 1672x941(약 16:9) 기준으로 제작되어 기존 UI 좌표를 그대로 유지한다.
      const endingBookBg = scene.add.image(
        960,
        525,
        'ending_book_bg'
      ).setDisplaySize(1560, 880)

      objects.push(endingBookBg)

      objects.push(
        scene.add.text(960, 98, 'ENDING BOOK', {
          fontSize: '44px',
          color: '#fff6e8',
          fontStyle: 'bold',
          letterSpacing: 2,
          padding: { left: 10, right: 10, top: 8, bottom: 4 }
        }).setOrigin(0.5)
      )

      objects.push(
        scene.add.text(960, 135, '기록된 결말과 단서를 확인합니다', {
          fontSize: '16px',
          color: '#f4e1c0',
          padding: { left: 8, right: 8, top: 4, bottom: 4 }
        }).setOrigin(0.5)
      )

      function addStatChip(x, y, width, label, value, fillColor, strokeColor) {
        const base = scene.add.rectangle(x, y, width, 54, fillColor, 0.95)
          .setStrokeStyle(3, strokeColor)
        const labelText = scene.add.text(x - width / 2 + 24, y, label, {
          fontSize: '18px',
          color: '#fff8ee',
          fontStyle: 'bold'
        }).setOrigin(0, 0.5)

        const valueBadge = scene.add.rectangle(
          x + width / 2 - 58,
          y,
          92,
          34,
          0xfff4d8,
          0.95
        ).setStrokeStyle(2, 0xe0c48c)

        const valueText = scene.add.text(
          x + width / 2 - 58,
          y,
          value,
          {
            fontSize: '18px',
            color: '#5d4632',
            fontStyle: 'bold'
          }
        ).setOrigin(0.5)

        objects.push(base, labelText, valueBadge, valueText)
      }

      // 각 페이지에 하나씩만 배치해서 책 중앙부가 답답해 보이지 않도록 한다.
      addStatChip(
        585,
        190,
        360,
        '발견한 엔딩',
        `${discoveredCount} / 6`,
        0x6f5845,
        0xf1ddaf
      )

      addStatChip(
        1335,
        190,
        360,
        '누적 단서',
        `${hintCount} / 10`,
        0x546b63,
        0xd7e8d9
      )

      const positions = [
        { x: 585, y: 350 },
        { x: 1335, y: 350 },
        { x: 585, y: 560 },
        { x: 1335, y: 560 },
        { x: 585, y: 770 },
        { x: 1335, y: 770 }
      ]

      const accentMap = {
        miko: { fill: 0xd58d72, border: 0x8e5140, emblem: 0xfff2da, mark: '01' },
        maid: { fill: 0x85a06f, border: 0x556747, emblem: 0xf3ffe8, mark: '02' },
        ghost: { fill: 0x7e93b8, border: 0x536683, emblem: 0xf1f6ff, mark: '03' },
        alchemist: { fill: 0xb48761, border: 0x80593b, emblem: 0xfff3e3, mark: '04' },
        fail: { fill: 0x9a8369, border: 0x6f5c49, emblem: 0xfff4e5, mark: '05' },
        hidden: { fill: 0x8a6bb4, border: 0x5b437b, emblem: 0xf8efff, mark: 'EX' }
      }

      BOOK_INFO.forEach((info, index) => {
        const pos = positions[index]
        const discovered = progress.endings[info.key]
        const accent = accentMap[info.key] || accentMap.hidden

        // 카드 그림자
        const cardShadow = scene.add.rectangle(
          pos.x + 8,
          pos.y + 8,
          692,
          202,
          0x000000,
          0.12
        )
        objects.push(cardShadow)

        const card = scene.add.rectangle(
          pos.x,
          pos.y,
          690,
          198,
          discovered ? 0xfff7e9 : 0xd9d2c7,
          1
        ).setStrokeStyle(
          4,
          discovered ? accent.border : 0x8a837a
        )
        objects.push(card)

        const accentBar = scene.add.rectangle(
          pos.x - 323,
          pos.y,
          18,
          184,
          discovered ? accent.fill : 0x958f88,
          1
        )
        objects.push(accentBar)

        const emblem = scene.add.circle(
          pos.x - 265,
          pos.y - 52,
          30,
          discovered ? accent.fill : 0xa29b92,
          1
        ).setStrokeStyle(3, discovered ? accent.border : 0x7e776f)
        objects.push(emblem)

        objects.push(
          scene.add.text(pos.x - 265, pos.y - 52, accent.mark, {
            fontSize: '18px',
            color: discovered ? '#fffaf0' : '#f4eee5',
            fontStyle: 'bold'
          }).setOrigin(0.5)
        )

        const displayTitle = discovered ? info.realTitle : '???'
        const displaySubtitle = discovered ? info.subtitle : '정체불명의 결말'
        const statusLabel = discovered ? 'DISCOVERED' : 'LOCKED'
        const statusFill = discovered ? accent.fill : 0x8b857d
        const statusTextColor = discovered ? '#fff8ef' : '#f0ece7'

        objects.push(
          scene.add.text(pos.x - 220, pos.y - 69, displayTitle, {
            fontSize: '27px',
            color: '#3d332a',
            fontStyle: 'bold',
            padding: { left: 8, right: 8, top: 12, bottom: 6 }
          }).setOrigin(0, 0.5)
        )

        const statusChip = scene.add.rectangle(
          pos.x + 250,
          pos.y - 64,
          118,
          34,
          statusFill,
          0.96
        ).setStrokeStyle(2, discovered ? accent.border : 0x726c65)
        objects.push(statusChip)

        objects.push(
          scene.add.text(pos.x + 250, pos.y - 64, statusLabel, {
            fontSize: '15px',
            color: statusTextColor,
            fontStyle: 'bold'
          }).setOrigin(0.5)
        )

        objects.push(
          scene.add.text(pos.x - 220, pos.y - 31, displaySubtitle, {
            fontSize: '18px',
            color: '#6c5d50',
            padding: { left: 8, right: 8, top: 10, bottom: 6 }
          }).setOrigin(0, 0.5)
        )

        const hintLines = []

        if (info.key === 'hidden') {
          if (progress.resetCount >= HINT_UNLOCK_ORDER.length) {
            hintLines.push(`히든 단서 : ${info.hints[0]}`)
          } else {
            const remain = HINT_UNLOCK_ORDER.length - Math.min(
              progress.resetCount,
              HINT_UNLOCK_ORDER.length
            )
            hintLines.push(`히든 단서 : 일반 단서를 ${remain}개 더 모으면 열린다.`)
          }
        } else {
          const unlocked = getUnlockedHints(info.key)

          if (unlocked.length === 0) {
            hintLines.push('단서 : 아직 없음')
          } else {
            unlocked.forEach(hintIndex => {
              hintLines.push(`단서 : ${info.hints[hintIndex]}`)
            })
          }
        }

        const hintPanel = scene.add.rectangle(
          pos.x - 2,
          pos.y + 42,
          560,
          90,
          discovered ? 0xf8efdd : 0xebe4da,
          0.96
        ).setStrokeStyle(2, discovered ? 0xe1ceb0 : 0xd0c7ba)
        objects.push(hintPanel)

        objects.push(
          scene.add.text(pos.x - 272, pos.y + 4, hintLines.join('\n'), {
            fontSize: '17px',
            color: '#4e4338',
            wordWrap: { width: 530 },
            lineSpacing: 8,
            padding: { left: 8, right: 8, top: 10, bottom: 6 }
          }).setOrigin(0, 0)
        )
      })

      const closeShadow = scene.add.rectangle(
        960,
        958,
        246,
        64,
        0x000000,
        0.18
      )
      objects.push(closeShadow)

      const closeButton = scene.add.rectangle(
        960,
        952,
        240,
        58,
        0x6b5847,
        0.98
      ).setStrokeStyle(4, 0xf5dfb5)
        .setInteractive({ useHandCursor: true })

      const closeText = scene.add.text(960, 952, '닫기', {
        fontSize: '25px',
        color: '#fffaf1',
        fontStyle: 'bold',
        padding: { left: 8, right: 8, top: 10, bottom: 6 }
      }).setOrigin(0.5)

      // endingbook.png에 X 그림이 포함되어 있으므로
      // 기존 위치에는 투명 클릭 영역만 둔다.
      const miniCloseButton = scene.add.rectangle(
        1650,
        110,
        72,
        72,
        0x000000,
        0
      ).setInteractive({ useHandCursor: true })

      ;[closeButton, closeText, miniCloseButton].forEach(target => {
        target.on?.('pointerdown', closeEndingBook)
      })

      closeButton.on('pointerover', () => {
        closeButton.setScale(1.03)
        closeText.setScale(1.03)
      })
      closeButton.on('pointerout', () => {
        closeButton.setScale(1)
        closeText.setScale(1)
      })

      miniCloseButton.on('pointerover', () => {
        miniCloseButton.setScale(1.06)
      })
      miniCloseButton.on('pointerout', () => {
        miniCloseButton.setScale(1)
      })

      objects.push(closeButton, closeText, miniCloseButton)

      bookOverlay = scene.add.container(0, 0, objects).setDepth(1000)
    }

    // =====================================================
    // 엔딩 화면
    // =====================================================
    function createEndingSymbolHighlight(endingType) {
      // background_4 안의 네 상징 위치 (1920×1080 기준)
      // 무녀=새 / 메이드=너구리 / 유령=유령 / 연금술사=포션
      const symbolMap = {
        miko:      { x: 1130, y: 115, radius: 92, label: '성스러운 새' },
        maid:      { x: 1210, y: 475, radius: 94, label: '숲의 너구리' },
        ghost:     { x: 960,  y: 535, radius: 86, label: '작은 유령' },
        alchemist: { x: 730,  y: 465, radius: 82, label: '연금 포션' }
      }

      const symbol = symbolMap[endingType]
      if (!symbol) return null

      const dim = scene.add.rectangle(
        960,
        540,
        1920,
        1080,
        0x000000,
        0.16
      ).setDepth(940)

      const glow = scene.add.circle(
        symbol.x,
        symbol.y,
        symbol.radius,
        0xffd86b,
        0.14
      ).setDepth(942)
        .setBlendMode(Phaser.BlendModes.ADD)

      const ring1 = scene.add.circle(
        symbol.x,
        symbol.y,
        symbol.radius,
        0x000000,
        0
      ).setStrokeStyle(5, 0xffdf76, 0.95)
        .setDepth(943)
        .setBlendMode(Phaser.BlendModes.ADD)

      const ring2 = scene.add.circle(
        symbol.x,
        symbol.y,
        symbol.radius * 1.18,
        0x000000,
        0
      ).setStrokeStyle(2, 0xffffff, 0.58)
        .setDepth(943)
        .setBlendMode(Phaser.BlendModes.ADD)

      const label = scene.add.text(
        symbol.x,
        symbol.y + symbol.radius + 34,
        symbol.label,
        {
          fontSize: '22px',
          color: '#ffe89a',
          stroke: '#1a1630',
          strokeThickness: 5
        }
      ).setOrigin(0.5).setDepth(944).setAlpha(0)

      scene.tweens.add({
        targets: [glow, ring1],
        scaleX: 1.12,
        scaleY: 1.12,
        alpha: 0.72,
        duration: 850,
        ease: 'Sine.InOut',
        yoyo: true,
        repeat: -1
      })

      scene.tweens.add({
        targets: ring2,
        scaleX: 1.16,
        scaleY: 1.16,
        alpha: 0.18,
        duration: 1200,
        ease: 'Sine.Out',
        yoyo: true,
        repeat: -1
      })

      scene.tweens.add({
        targets: label,
        alpha: 1,
        y: label.y - 8,
        duration: 700,
        delay: 450,
        ease: 'Sine.Out'
      })

      return scene.add.container(0, 0, [dim, glow, ring1, ring2, label])
        .setDepth(940)
    }

    function closeGameConfirmModal() {
      if (gameConfirmModal) {
        gameConfirmModal.destroy(true)
        gameConfirmModal = null
      }
      endingResetConfirmOpen = false
    }

    function openGameConfirm({ title, message, confirmText = '확인', cancelText = '취소', onConfirm = null }) {
      if (gameConfirmModal) return

      endingResetConfirmOpen = true

      const shade = scene.add.rectangle(
        960,
        540,
        1920,
        1080,
        0x000000,
        0.58
      ).setDepth(980).setInteractive()

      const panel = scene.add.rectangle(
        960,
        540,
        760,
        320,
        0xf5ead0,
        0.98
      ).setStrokeStyle(6, 0x5b4937).setDepth(981)

      const titleText = scene.add.text(960, 448, title, {
        fontSize: '34px',
        color: '#3b3027',
        padding: { left: 8, right: 8, top: 14, bottom: 8 }
      }).setOrigin(0.5).setDepth(982)

      const messageTextObj = scene.add.text(960, 536, message, {
        fontSize: '24px',
        color: '#4a3a2b',
        align: 'center',
        wordWrap: { width: 620 },
        padding: { left: 8, right: 8, top: 14, bottom: 8 }
      }).setOrigin(0.5).setDepth(982)

      const cancelButton = scene.add.rectangle(
        820,
        645,
        180,
        58,
        0x7c879c,
        1
      ).setStrokeStyle(4, 0xffffff).setDepth(982).setInteractive({ useHandCursor: true })

      const confirmButton = scene.add.rectangle(
        1100,
        645,
        220,
        58,
        0xb36b5f,
        1
      ).setStrokeStyle(4, 0xffffff).setDepth(982).setInteractive({ useHandCursor: true })

      const cancelLabel = scene.add.text(820, 645, cancelText, {
        fontSize: '24px',
        color: '#ffffff',
        padding: { left: 8, right: 8, top: 12, bottom: 8 }
      }).setOrigin(0.5).setDepth(983)

      const confirmLabel = scene.add.text(1100, 645, confirmText, {
        fontSize: '24px',
        color: '#ffffff',
        padding: { left: 8, right: 8, top: 12, bottom: 8 }
      }).setOrigin(0.5).setDepth(983)

      cancelButton.on('pointerdown', () => {
        closeGameConfirmModal()
      })

      shade.on('pointerdown', () => {
        closeGameConfirmModal()
      })

      confirmButton.on('pointerdown', () => {
        const callback = onConfirm
        closeGameConfirmModal()
        if (typeof callback === 'function') callback()
      })

      gameConfirmModal = scene.add.container(0, 0, [
        shade,
        panel,
        titleText,
        messageTextObj,
        cancelButton,
        confirmButton,
        cancelLabel,
        confirmLabel
      ]).setDepth(980).setAlpha(0)

      scene.tweens.add({
        targets: gameConfirmModal,
        alpha: 1,
        duration: 160,
        ease: 'Sine.Out'
      })
    }

    function confirmResetFromEnding() {
      if (endingResetConfirmOpen || gameConfirmModal) return

      openGameConfirm({
        title: '처음부터 다시 시작',
        message: '엔딩 화면을 닫고\n처음부터 다시 시작할까요?',
        confirmText: '리셋',
        cancelText: '취소',
        onConfirm: () => {
          progress.resetCount += 1
          saveProgress()
          scene.scene.restart()
        }
      })
    }

    function showEndingPanel(ending, isNew, extraObjects = []) {
      // background_4의 상징을 가리지 않도록 엔딩 정보는 아래쪽에 둔다.
      const shade = scene.add.rectangle(
        960,
        860,
        1920,
        440,
        0x000000,
        0.38
      )

      const panel = scene.add.rectangle(
        960,
        860,
        1040,
        300,
        0xf5ead0,
        0.95
      ).setStrokeStyle(8, 0x5b4937)

      const title = scene.add.text(960, 785, ending.title, {
        fontSize: '52px',
        color: '#3b3027',
        padding: { left: 8, right: 8, top: 12, bottom: 8 }
      }).setOrigin(0.5)

      const subtitle = scene.add.text(960, 850, ending.subtitle, {
        fontSize: '32px',
        color: '#775a3d',
        padding: { left: 8, right: 8, top: 14, bottom: 8 }
      }).setOrigin(0.5)

      const reason = scene.add.text(960, 912, ending.reason, {
        fontSize: '21px',
        color: '#3b3027',
        wordWrap: { width: 900 },
        align: 'center',
        padding: { left: 8, right: 8, top: 12, bottom: 8 }
      }).setOrigin(0.5)

      const recordText = scene.add.text(
        960,
        970,
        isNew
          ? 'NEW! 엔딩 도감에 기록되었습니다.'
          : '이미 발견한 엔딩입니다.',
        {
          fontSize: '19px',
          color: isNew ? '#a46900' : '#66584b',
          padding: { left: 8, right: 8, top: 12, bottom: 8 }
        }
      ).setOrigin(0.5)

      const resetGuide = scene.add.text(960, 998, '화면 클릭 → 처음부터 다시 시작', {
        fontSize: '17px',
        color: '#d8c8ad',
        stroke: '#2b2118',
        strokeThickness: 3,
        padding: { left: 8, right: 8, top: 10, bottom: 8 }
      }).setOrigin(0.5)

      // 6종 모든 엔딩에서 화면 어디를 눌러도 확인창을 띄운다.
      const clickZone = scene.add.rectangle(
        960,
        540,
        1920,
        1080,
        0xffffff,
        0.001
      ).setInteractive({ useHandCursor: true })

      clickZone.on('pointerdown', confirmResetFromEnding)

      endingOverlay = scene.add.container(
        0,
        0,
        [
          ...extraObjects,
          shade,
          panel,
          title,
          subtitle,
          reason,
          recordText,
          resetGuide,
          clickZone
        ]
      ).setDepth(950).setAlpha(0)

      scene.tweens.add({
        targets: endingOverlay,
        alpha: 1,
        duration: 650,
        ease: 'Sine.Out'
      })
    }

    // =====================================================
    // 일반 엔딩 1~4 : 망원경 집결 → 렌즈 발광 → 하늘로 스크롤
    // =====================================================
    const ENDING_TELESCOPE_SLOTS = [
      { x: 875, y: 430 },
      { x: 955, y: 505 },
      { x: 1125, y: 500 },
      { x: 1205, y: 425 }
    ]

    function prepareEndingTelescope() {
      const telescope = campItems.find(item => item.id === 10)
      if (!telescope) return null

      // 해당 루트에서 망원경을 선택하지 않았더라도 엔딩 연출에서는 반드시 등장.
      telescope.container.setVisible(true)
      telescope.container.setAlpha(1)
      telescope.container.setScale(1.08)
      telescope.container.setDepth(280)

      if (telescope.equipmentSprite) {
        if (!telescope.selected) {
          telescope.equipmentSprite.setTexture('telescope_1')
          const spriteConfig = EQUIPMENT_SPRITE_CONFIG.telescope
          if (spriteConfig && telescope.equipmentSprite.width > 0) {
            const ratio = telescope.equipmentSprite.height / telescope.equipmentSprite.width
            telescope.equipmentSprite.setDisplaySize(
              spriteConfig.width,
              spriteConfig.width * ratio
            )
          }
        }
        telescope.equipmentSprite.setAlpha(1)
      }

      telescope.statusText.setVisible(false)
      return telescope
    }

    function createEndingTelescopeGlow(telescope) {
      if (!telescope) return null

      const lensX = telescope.container.x + 52
      const lensY = telescope.container.y - 48

      const glow = scene.add.circle(
        lensX,
        lensY,
        24,
        0xdff5ff,
        0.24
      ).setDepth(360).setBlendMode(Phaser.BlendModes.ADD)

      const ring = scene.add.circle(
        lensX,
        lensY,
        31,
        0x000000,
        0
      ).setStrokeStyle(4, 0xbdeaff, 0.95)
        .setDepth(361)
        .setBlendMode(Phaser.BlendModes.ADD)

      const star = scene.add.text(lensX, lensY, '✦', {
        fontSize: '35px',
        color: '#ffffff',
        stroke: '#8cd8ff',
        strokeThickness: 5
      }).setOrigin(0.5).setDepth(362)

      scene.tweens.add({
        targets: [glow, ring],
        scaleX: 1.35,
        scaleY: 1.35,
        alpha: 0.35,
        duration: 520,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.InOut'
      })

      scene.tweens.add({
        targets: star,
        angle: 90,
        scaleX: 1.25,
        scaleY: 1.25,
        duration: 900,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.InOut'
      })

      return scene.add.container(0, 0, [glow, ring, star]).setDepth(360)
    }

    function gatherCharactersAtTelescope(onComplete) {
      const characters = getCharacters()
      if (characters.length === 0) {
        onComplete()
        return
      }

      clearAllReservations()
      let finished = 0

      characters.forEach((character, index) => {
        const target = ENDING_TELESCOPE_SLOTS[index % ENDING_TELESCOPE_SLOTS.length]

        scene.time.delayedCall(index * 110, () => {
          teleportCharacterToPoint(character, target, () => {
            character.container.setDepth(320 + index)
            character.statusText.setVisible(false)
            character.directionText.setVisible(false)
            finished += 1
            if (finished >= characters.length) onComplete()
          })
        })
      })
    }

    function playTelescopeEndingSequence(ending, isNew) {
      backgroundTransitionToken += 1
      scene.tweens.killTweensOf([activeBackground, standbyBackground, timeColorOverlay])
      timeColorOverlay.setAlpha(0)

      const telescope = prepareEndingTelescope()
      const gatherCaption = scene.add.text(960, 700, '모두가 망원경 곁으로 모였다.', {
        fontSize: '28px',
        color: '#fff6cf',
        stroke: '#17223d',
        strokeThickness: 6
      }).setOrigin(0.5).setDepth(610).setAlpha(0)

      scene.tweens.add({
        targets: gatherCaption,
        alpha: 1,
        y: 690,
        duration: 420,
        ease: 'Sine.Out'
      })

      gatherCharactersAtTelescope(() => {
        const lensFx = createEndingTelescopeGlow(telescope)

        scene.tweens.add({
          targets: gatherCaption,
          alpha: 0,
          duration: 450,
          delay: 420,
          onComplete: () => gatherCaption.destroy()
        })

        // 스크롤 덮어쓰기 대신 "망원경 시야가 멀어지는" 줌아웃 연출.
        // background_4를 크게 확대해 시작하고 천천히 전체 화면까지 축소한다.
        scene.time.delayedCall(850, () => {
          const sky = scene.add.image(960, 650, 'background_4')
            .setOrigin(0.5)
            .setDepth(900)
            .setAlpha(0)

          const baseScale = fitBackground(sky)
          const startScale = baseScale * 2.15
          sky.setScale(startScale)

          // 처음에는 기존 캠프가 비치다가, 렌즈 안의 풍경이 자연스럽게 확대되어
          // 화면 전체의 엔딩 배경으로 이어지는 느낌을 만든다.
          scene.tweens.add({
            targets: sky,
            alpha: 1,
            duration: 1150,
            ease: 'Sine.InOut'
          })

          scene.tweens.add({
            targets: sky,
            x: 960,
            y: 540,
            scaleX: baseScale,
            scaleY: baseScale,
            duration: 3500,
            ease: 'Cubic.InOut',
            onComplete: () => {
              if (lensFx) lensFx.destroy(true)

              const highlight = createEndingSymbolHighlight(ending.type)
              const extras = highlight ? [highlight] : []

              scene.time.delayedCall(650, () => {
                showEndingPanel(ending, isNew, extras)
              })
            }
          })

          // 줌아웃이 시작된 뒤 망원경 렌즈 빛을 서서히 약하게 만든다.
          if (lensFx) {
            scene.tweens.add({
              targets: lensFx,
              alpha: 0,
              duration: 850,
              delay: 600,
              ease: 'Sine.Out'
            })
          }
        })
      })
    }

    function isHiddenConditionMet() {
      return selectionOrder.length === 10 && selectionOrder[9] === 5
    }

    function stopEverythingForHiddenEnding() {
      hiddenSequenceRunning = true
      hiddenEndingVisualLocked = true
      gameOver = true
      actionSequenceToken += 1
      clearBottomUnlockTimer()
      setBottomInputLocked(true)
      clearAllReservations()

      getCharacters().forEach(character => {
        cancelCharacterMovement(character)
        releaseActionReservation(character)
        character.wanderRunning = false
        character.statusText.setText('정지')
      })
    }

    async function gatherCharactersAtHiddenEndingNodes() {
      const characters = getCharacters()

      // 네 캐릭터를 각자 지정된 히든 엔딩 노드로 동시에 순간이동.
      await Promise.all(
        characters.map(character => {
          const node = HIDDEN_ENDING_CHARACTER_NODES[character.id]
          if (!node) return Promise.resolve()

          return new Promise(resolve => {
            teleportCharacterToPoint(character, node.point, success => {
              if (success) {
                character.atHome = false
                character.statusText.setText('대기')

                // 히든 엔딩 트리거가 확정된 경우에만
                // 각 캐릭터를 *_hidden.png로 교체하고 좌우 반전해서 세운다.
                showHiddenEndingCharacter(character)
              }
              resolve()
            })
          })
        })
      )
    }

    function hiddenWait(ms) {
      return new Promise(resolve => {
        scene.time.delayedCall(ms, resolve)
      })
    }

    function tweenHidden(targets, config) {
      return new Promise(resolve => {
        scene.tweens.add({
          targets,
          ...config,
          onComplete: resolve
        })
      })
    }

    async function playHiddenEffectAt(x, y, scale = 0.62, depth = 748) {
      console.log('[HIDDEN] smoke 4-frame', x, y)

      // hidden_effect가 가로 4프레임 시트일 때 idle처럼 순서대로 재생.
      if (hiddenSmokeReady && scene.anims.exists('hidden_smoke_anim')) {
        const smoke = scene.add.sprite(x, y, 'hidden_effect', 'smoke_0')
          .setDepth(depth)
          .setAlpha(1)

        // 원본 시트 크기에 상관없이 게임 화면에서는 일정한 크기로 보이게 한다.
        const frame = scene.textures.getFrame('hidden_effect', 'smoke_0')
        const frameW = frame?.width || smoke.width || 1
        const frameH = frame?.height || smoke.height || 1
        const targetHeight = 460 * scale
        const targetWidth = targetHeight * (frameW / frameH)
        smoke.setDisplaySize(targetWidth, targetHeight)

        await new Promise(resolve => {
          let finished = false

          const finish = () => {
            if (finished) return
            finished = true
            if (smoke.active) smoke.destroy()
            resolve()
          }

          smoke.once('animationcomplete-hidden_smoke_anim', finish)
          smoke.play('hidden_smoke_anim')

          // 혹시 animationcomplete 이벤트가 누락돼도 시퀀스가 멈추지 않게 안전장치.
          scene.time.delayedCall(1000, finish)
        })

        return
      }

      // 에셋 분할에 실패했을 때만 최소 fallback.
      const fallback = scene.add.image(x, y, 'hidden_effect')
        .setDepth(depth)
        .setAlpha(1)
        .setScale(0.36 * scale)

      await hiddenWait(320)
      if (fallback.active) fallback.destroy()
    }

    function createHiddenCharacterAt(x, y) {
      const hidden = scene.add.image(x, y, 'hidden_appear')
        .setDepth(735)
        .setAlpha(0)

      if (hidden.height > 0) {
        hidden.setDisplaySize(
          HIDDEN_CHARACTER_HEIGHT * (hidden.width / hidden.height),
          HIDDEN_CHARACTER_HEIGHT
        )
      }

      return hidden
    }

    async function revealHiddenCharacter(hidden) {
      console.log('[HIDDEN] reveal behind smoke')

      // 연기가 앞에서 4프레임 재생되는 동안 캐릭터가 뒤에서 나타난다.
      const smokePromise = playHiddenEffectAt(
        hidden.x,
        hidden.y + 2,
        0.92,
        hidden.depth + 4
      )

      await hiddenWait(105)

      const revealPromise = tweenHidden(hidden, {
        alpha: 1,
        y: hidden.y - 8,
        duration: 230,
        ease: 'Back.Out'
      })

      await Promise.all([smokePromise, revealPromise])
    }

    async function moveHiddenCharacter(hidden, x, y) {
      const distance = Phaser.Math.Distance.Between(hidden.x, hidden.y, x, y)
      const duration = Math.max(100, (distance / HIDDEN_MOVE_SPEED) * 1000)

      console.log('[HIDDEN] move', x, y, duration)

      await tweenHidden(hidden, {
        x,
        y,
        duration,
        ease: 'Sine.InOut'
      })
    }

    async function showHiddenCutscene() {
      console.log('[HIDDEN] cutscene start')

      const shade = scene.add.rectangle(960, 540, 1920, 1080, 0x000000, 0.78)
        .setDepth(780)
        .setAlpha(0)

      const cut = scene.add.image(960, 510, 'hidden_cut')
        .setDepth(781)
        .setAlpha(0)

      const sourceWidth = cut.width || 1
      const sourceHeight = cut.height || 1
      const fitScale = Math.min(1760 / sourceWidth, 820 / sourceHeight)
      if (Number.isFinite(fitScale) && fitScale > 0) cut.setScale(fitScale)

      const name = scene.add.text(960, 900, 'Double D.ol — 늦게 온 해결사', {
        fontSize: '42px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 8
      }).setOrigin(0.5).setDepth(782).setAlpha(0)

      const line = scene.add.text(960, 960, '“늦었지? 원래 해결사는 마지막에 오는 거야.”', {
        fontSize: '27px',
        color: '#ffd36a',
        stroke: '#000000',
        strokeThickness: 6
      }).setOrigin(0.5).setDepth(782).setAlpha(0)

      const cutObjects = [shade, cut, name, line]

      await tweenHidden(cutObjects, {
        alpha: 1,
        duration: 180,
        ease: 'Sine.Out'
      })

      await hiddenWait(1050)

      await tweenHidden(cutObjects, {
        alpha: 0,
        duration: 240,
        ease: 'Sine.In'
      })

      cutObjects.forEach(obj => {
        if (obj && obj.active) obj.destroy()
      })

      console.log('[HIDDEN] cutscene end')
    }

    function forceEquipmentToStage3(equipment) {
      equipment.selected = true
      equipment.level = Math.max(equipment.level, HIDDEN_STAGE3_LEVEL)
      updateEquipmentTexture(equipment)
      refreshVisuals()
    }

    async function runHiddenObjectUpgrade(hidden, equipment) {
      const targetX = equipment.container.x - 78
      const targetY = equipment.container.y + 18

      await moveHiddenCharacter(hidden, targetX, targetY)

      // 오브젝트와 히든 캐릭터가 겹치는 지점에 4프레임 연기를 재생해
      // 변화 순간을 가렸다가 바로 Stage 3 상태를 보여준다.
      const smokeX = Phaser.Math.Linear(hidden.x, equipment.container.x, 0.62)
      const smokeY = Phaser.Math.Linear(hidden.y, equipment.container.y, 0.62)
      await playHiddenEffectAt(smokeX, smokeY, 0.82, hidden.depth + 5)

      forceEquipmentToStage3(equipment)
      pulseEquipment(equipment)

      hidden.setTexture('hidden_end')
      if (hidden.height > 0) {
        hidden.setDisplaySize(
          HIDDEN_CHARACTER_HEIGHT * (hidden.width / hidden.height),
          HIDDEN_CHARACTER_HEIGHT
        )
      }

      showFloatingText(
        equipment.container.x,
        equipment.container.y - 105,
        'STAGE 3!',
        {
          fontSize: '27px',
          color: '#ffe27a',
          duration: 780,
          rise: 36,
          depth: 760
        }
      )

      await hiddenWait(HIDDEN_OBJECT_PAUSE_MS)

      if (hidden.active) {
        hidden.setTexture('hidden_appear')
        if (hidden.height > 0) {
          hidden.setDisplaySize(
            HIDDEN_CHARACTER_HEIGHT * (hidden.width / hidden.height),
            HIDDEN_CHARACTER_HEIGHT
          )
        }
      }
    }

    async function runHiddenEndingSequence() {
      if (hiddenSequenceRunning) return

      stopEverythingForHiddenEnding()
      console.log('[HIDDEN] sequence start')

      try {
        // 히든 엔딩이 확정되는 순간 기존 행동 위치를 전부 버리고
        // 4명을 다리 북동쪽 공터의 전용 노드에 집결시킨다.
        messageText.setText('모두 다리 북동쪽 공터로 모였다!')
        await gatherCharactersAtHiddenEndingNodes()
        await hiddenWait(180)

        const camperVan = campItems.find(item => item.id === 5)
        const spawnX = camperVan ? camperVan.container.x + 115 : 480
        const spawnY = camperVan ? camperVan.container.y + 30 : 380

        messageText.setText('뭔가가 캠핑카 쪽에서 난입했다!')

        await playHiddenEffectAt(spawnX, spawnY, 0.72)

        const hidden = createHiddenCharacterAt(spawnX, spawnY)
        await revealHiddenCharacter(hidden)

        // 등장 직후 바로 컷신. 이전 버전처럼 중간 callback 체인에 의존하지 않는다.
        await showHiddenCutscene()

        messageText.setText('Double D.ol이 캠프를 강제로 완성시키기 시작했다!')

        // 캠핑카 포함 6개 장비를 5 → 10 순서로 강제 3단계 성장.
        const allEquipment = campItems
          .filter(item => item.type === 'equipment')
          .sort((a, b) => a.id - b.id)

        for (const equipment of allEquipment) {
          if (!hidden.active) break
          await runHiddenObjectUpgrade(hidden, equipment)
        }

        if (hidden.active) {
          hidden.setTexture('hidden_end')
          if (hidden.height > 0) {
            hidden.setDisplaySize(
              HIDDEN_CHARACTER_HEIGHT * (hidden.width / hidden.height),
              HIDDEN_CHARACTER_HEIGHT
            )
          }
        }

        await hiddenWait(500)

        const ending = {
          type: 'hidden',
          title: 'HIDDEN ENDING',
          subtitle: '늦게 온 해결사',
          reason: 'Double D.ol이 캠프에 난입해 모든 오브젝트를 순식간에 3단계 완성 상태로 끌어올렸다.'
        }

        const isNew = unlockEnding('hidden')
        if (isNew) showUnlockToast(ending)

        if (hidden.active) hidden.destroy()
        hiddenSequenceRunning = false
        showEndingPanel(ending, isNew)
        console.log('[HIDDEN] sequence complete')
      } catch (error) {
        console.error('[HIDDEN] sequence error', error)

        // 에셋 또는 tween 하나가 실패해도 히든 엔딩 자체는 막히지 않게 한다.
        const ending = {
          type: 'hidden',
          title: 'HIDDEN ENDING',
          subtitle: '늦게 온 해결사',
          reason: 'Double D.ol이 캠프를 강제로 완성했다.'
        }

        const isNew = unlockEnding('hidden')
        hiddenSequenceRunning = false
        showEndingPanel(ending, isNew)
      }
    }

    function showEnding() {
      if (hiddenSequenceRunning) return
      if (gameOver && !endingOverlay) return

      gameOver = true
      actionSequenceToken += 1
      setBottomInputLocked(true)
      clearBottomUnlockTimer()

      getCharacters().forEach(character => {
        cancelCharacterMovement(character)
        character.wanderRunning = false
      })

      const ending = resolveEnding()

      if (ending.type === 'hidden') {
        gameOver = false
        runHiddenEndingSequence()
        return
      }

      const isNew = unlockEnding(ending.type)
      if (isNew) showUnlockToast(ending)

      // 일반 4엔딩은 망원경 집결 → 하늘 스크롤 → 상징 하이라이트 연출을 사용.
      if (['miko', 'maid', 'ghost', 'alchemist'].includes(ending.type)) {
        playTelescopeEndingSequence(ending, isNew)
        return
      }

      // 실패 / 히든 엔딩은 현재 시간대 배경을 유지한다.
      showEndingPanel(ending, isNew)
    }

    // =====================================================
    // 장비 성장 적용
    //
    // 선택 순간에는 기존 장비 레벨을 올리지 않는다.
    // 이번 턴의 이동/상호작용/! 연출이 끝난 뒤 성장시킨다.
    // Stage 2 / Stage 3 이미지 교체도 이 시점에 발생.
    // =====================================================
    function applyPendingEquipmentGrowth(pendingGrowth, onComplete) {
      const stageUpItems = []

      pendingGrowth.forEach(entry => {
        const item = entry.item
        if (!item.selected || item.level >= 10) return

        const oldStage = getEquipmentStage(item.level)
        item.level = Math.min(10, item.level + 1)
        const newStage = getEquipmentStage(item.level)

        if (newStage > oldStage) {
          stageUpItems.push(item)
        }
      })

      // 레벨/스프라이트를 상호작용 뒤에 실제 반영
      refreshVisuals()

      playStageUpEffects(stageUpItems, onComplete)
    }

    // =====================================================
    // 턴 큐
    // 1) 선택한 요소 등장/활성
    // 2) 이동
    // 3) 행동
    // 4) 장비 반응
    // 5) !
    // 6) 기존 장비 성장 + Stage 이미지 교체
    // 7) 2초 후 입력 해제
    // =====================================================
    function runTurnSequence(item, pendingGrowth, sequenceToken) {
      const finishAfterGrowth = () => {
        if (sequenceToken !== actionSequenceToken) return

        applyPendingEquipmentGrowth(pendingGrowth, () => {
          if (sequenceToken !== actionSequenceToken) return
          finishTurnAfterAction(sequenceToken)
        })
      }

      if (item.type === 'character') {
        activateCharacter(item, () => {
          if (sequenceToken !== actionSequenceToken) return
          finishAfterGrowth()
        })
        return
      }

      const targetScale = getEquipmentScale(item.level)
      item.container.setAlpha(1)
      item.container.setScale(0.2)

      scene.tweens.add({
        targets: item.container,
        scaleX: targetScale,
        scaleY: targetScale,
        duration: 300,
        ease: 'Back.Out',
        onComplete: () => {
          if (sequenceToken !== actionSequenceToken) return

          // 10번째 선택이 캠핑카면 일반 캐릭터 이동/상호작용을 즉시 중단하고
          // 히든 엔딩 연출이 최우선으로 시작된다.
          if (isHiddenConditionMet()) {
            runHiddenEndingSequence()
            return
          }

          runEquipmentInteractionTurn(item, () => {
            if (sequenceToken !== actionSequenceToken) return
            finishAfterGrowth()
          })
        }
      })
    }

    // =====================================================
    // 선택 처리
    // =====================================================
    function selectItem(item) {
      if (gameOver || bookOpen || bottomInputLocked || hiddenSequenceRunning) return

      if (item.selected) {
        messageText.setText(`${item.name}은 이미 선택했습니다`)
        return
      }

      setBottomInputLocked(true)
      messageText.setText(`${item.name} 연출 중...`)

      const sequenceToken = ++actionSequenceToken

      // 현재 설치되어 있는 장비들의 성장을 예약만 해둔다.
      // 실제 레벨 증가는 이번 턴 상호작용이 끝난 뒤.
      const pendingGrowth = campItems
        .filter(otherItem => {
          return (
            otherItem.type === 'equipment' &&
            otherItem.selected &&
            otherItem.level < 10
          )
        })
        .map(otherItem => ({
          item: otherItem,
          fromLevel: otherItem.level,
          toLevel: Math.min(10, otherItem.level + 1)
        }))

      item.selected = true
      item.level = 1
      turn += 1
      selectionOrder.push(item.id)

      // 이번 선택으로 일반 엔딩 루트가 완성되었다면 즉시 연출 포커스를 잠근다.
      // 따라서 루트를 완성한 바로 그 장비부터 중복 캐릭터 연출이 발생하지 않는다.
      refreshConfirmedEndingFocus()

      // 새로 선택한 장비는 LV1 이미지로 즉시 등장
      refreshVisuals()

      // 4턴부터 석양, 7턴부터 밤. 행동 연출과 동시에 자연스럽게 전환된다.
      syncBackgroundToTurn(true)

      // 히든 조건은 다른 모든 이동/상호작용보다 우선한다.
      // 마지막 선택이 캠핑카인 순간 기존 연출을 끊고 히든 시퀀스로 전환.
      if (isHiddenConditionMet()) {
        runHiddenEndingSequence()
        return
      }

      runTurnSequence(item, pendingGrowth, sequenceToken)
    }

    // =====================================================
    // RESET / BOOK
    // =====================================================
    resetButton.on('pointerdown', () => {
      if (gameConfirmModal) return

      openGameConfirm({
        title: '캠프 리셋',
        message: '지금까지 진행한 선택을 모두 지우고\n처음부터 다시 시작할까요?',
        confirmText: '리셋',
        cancelText: '취소',
        onConfirm: () => {
          progress.resetCount += 1
          saveProgress()
          scene.scene.restart()
        }
      })
    })

    bookButton.on('pointerdown', openEndingBook)


    // =====================================================
    // 시작
    // =====================================================
    if (DEBUG_SHOW_INTERACTION_POINTS) {
      validateGameData()
    }

    refreshVisuals()
    syncBackgroundToTurn(false)

    getCharacters().forEach(character => setCharacterIdle(character))
    console.log('GROW CAMP MOVE: teleport + 4 interaction slots per equipment')
  }
}

const config = {
  type: Phaser.AUTO,
  backgroundColor: '#243447',
  parent: 'app',
  pixelArt: false,
  antialias: true,
  roundPixels: false,
  render: {
    antialias: true,
    pixelArt: false,
    roundPixels: false
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 1920,
    height: 1080
  },
  scene: MainScene
}

new Phaser.Game(config)
