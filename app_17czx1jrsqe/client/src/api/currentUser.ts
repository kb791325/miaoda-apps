// 模块级当前用户桥接：React Context(user) -> 非组件的 api 层（如审批流程引擎取申请人/审批人）
let _currentUser: any = null;

export function setCurrentUser(user: any): void {
  _currentUser = user;
}

export function getCurrentUser(): any {
  return _currentUser;
}
