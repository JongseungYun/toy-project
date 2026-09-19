# 그림판 e2e가 그림면이 그려지기 전에 좌표를 읽는다

## 증상

`e2e/canvas.spec.ts`의 "그림판에 선, 도형, 글상자를 넣으면 다시 열어도 그대로 있다"가
`TypeError: Cannot read properties of null (reading 'x')`로 실패한다. 다른 테스트와 함께
돌 때만 나고, 그 테스트만 `-g`로 골라 돌리면 통과한다.

## 관찰한 근거

이번 작업(서식 메뉴 수정)에서 전체 실행과 `canvas.spec.ts` 단독 실행 모두에서 재현했다.
같은 파일을 `git stash`로 되돌린 상태에서도 똑같이 실패해, 이번 변경과는 무관하다.
그림판은 서식 메뉴를 쓰지도 않는다.

실패 시점의 페이지 스냅샷은 `complementary`와 `main`이 모두 빈 상태다. 화면이 아직
그려지지 않았다.

## 짐작하는 원인

`drag()`가 `const box = (await paper.boundingBox())!;`로 null 가능성을 지운다.
그림면이 아직 없으면 `boundingBox()`가 null을 주고 다음 줄에서 터진다. 앞선 테스트가
Supabase 왕복을 기다리는 동안 이 테스트의 첫 화면이 늦게 도착하면 그 틈이 생긴다.

## 해본 것

고치지 않았다. 제품 동작이 아니라 테스트가 기다리지 않는 문제이고, `AGENTS.md`의
검증·리뷰 예산에서 범위 밖으로 두었다.

## 다음에 할 일

`drag()`와 첫 `pickTool()` 앞에서 그림면이 실제로 자리를 잡았는지 기다린다.
`await expect(paper).toBeVisible()`만으로는 부족할 수 있으니, `boundingBox()`가
값을 줄 때까지 기다리는 쪽이 확실하다.
