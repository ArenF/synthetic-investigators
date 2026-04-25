
type PageType = 'Main' | 'GamePlay' | 'PlayerCreate' | 'PlayerEdit' | 'ScenarioCreate' | 'ScenarioEdit';

type AttrType = {
    name: string,
    defaultVal: number,
    value: number,
};

//HTML 속성 - 타입 변환
type InputTypeAttr = 'text' | 'password' | 'checkbox' | 'radio' | 'file' | 'button' | 'submit' | 'hidden' | 'email' | 'number' | 'range' | 'date' | 'color';

export type { PageType, AttrType, InputTypeAttr }; 