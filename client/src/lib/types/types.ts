
type PageType = 'Main' | 'GamePlay' | 'PlayerCreate' | 'PlayerEdit' | 'ScenarioCreate' | 'ScenarioEdit';

type AttrType = {
    name: string,
    defaultVal: number,
    value: number,
};

//HTML 속성 - 타입 변환
type InputTypeAttr = 'text' | 'password' | 'checkbox' | 'radio' | 'file' | 'button' | 'submit' | 'hidden' | 'email' | 'number' | 'range' | 'date' | 'color';

//CharacterFunctionCell.svelte에서 사용
type CFCellType = (value:number) => void;

type WeaponDataType = {
    name: string,
    skill: '근접전(격투)' | '사격(권총)' | '사격(라/산)',
    roll: string,
    applyDamage: number,
    distance: number,
    frequency: number,
    leftBullet: number,
    broken: boolean
};

export type { PageType, AttrType, InputTypeAttr, CFCellType, WeaponDataType }; 