# Books Read

## 소개

읽었던 책들을 보여주는 사이트입니다.

csv 파일(`books.csv`)을 수정하면 GitHub contribution graph와 같은 독서 히트맵과 책 목록이 생성됩니다.

## 사용법

* 책을 읽으면 `books.csv`를 수정합니다.
  * 제목, 연도, 월을 입력합니다.
  * 한 책을 다른 연월에 여러번 읽었다면 각각 읽었던 기록을 기입합니다. 그러면 최근 읽었던 시점에 `N회차` 라는 태그가 표시됩니다. 독서 히트맵의 총 권수는 책 권 수가 아니라 독서 횟수로 계산합니다.
* 사이트 favicon을 바꾸고 싶으면 원하는 파일을 가져와 `favicon.ico`이라는 이름으로 덮어씁니다.
* GitHub pages(`github.io`)로 호스팅하려면 다음과 같은 방법이 있습니다.
    * 이 repo를 본인 public repo로 가져가기 (e.g., fork)
    * Settings → Pages 
      * Source를 Deploy from a branch로 설정
      * Branch를 main으로 설정