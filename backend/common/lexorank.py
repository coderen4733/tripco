class LexoRank:
    # LexoRank에서 주로 사용하는 Base36 (0-9, a-z) 문자 배열
    CHAR_SET = "0123456789abcdefghijklmnopqrstuvwxyz"

    # 첫 데이터 입력 시 사용할 기본 중간값
    @classmethod
    def get_middle(cls) -> str:
        return "i00000"

    # 이전 rank 문자열을 기준으로 뒤에 올 다음 rank 생성
    @classmethod
    def get_next(cls, prev_rank: str) -> str:
        chars = list(prev_rank)
        # 1. 오른쪽 끝자리부터 문자 올림(Increment) 계산
        for i in range(len(chars) - 1, -1, -1):
            curr_idx = cls.CHAR_SET.index(chars[i])
            if curr_idx < len(cls.CHAR_SET) - 1:
                # 다음 문자로 치환하고 종료
                chars[i] = cls.CHAR_SET[curr_idx + 1]
                return "".join(chars)
            else:
                # 'z'인 경우 '0'으로 만들고 올림 처리 계속 진행
                chars[i] = "0"
        # 2. 모든 자리가 'z'로 꽉 찼다면 자리수를 하나 늘려서 늘려줌
        return "".join(chars) + "i"

    # 두 rank 문자열 사이의 완벽한 중간값 생성 (드래그 앤 드롭용)
    @classmethod
    def get_between(cls, prev_rank: str, next_rank: str) -> str:
        # 1. 비교적 긴 자릿수에 맞추어 패딩 추가
        max_len = max(len(prev_rank), len(next_rank)) + 2
        p_str = prev_rank.ljust(max_len, "0")
        n_str = next_rank.ljust(max_len, "0")

        result = []
        for p_char, n_char in zip(p_str, n_str):
            p_idx = cls.CHAR_SET.index(p_char)
            n_idx = cls.CHAR_SET.index(n_char)
            mid_idx = (p_idx + n_idx) // 2
            result.append(cls.CHAR_SET[mid_idx])
            # 중간 값이 결정되었고, 앞뒤 경계에 걸치지 않았다면 루프 종료
            if p_idx != n_idx and mid_idx != p_idx:
                break
        return "".join(result).rstrip("0")

    # 맨 앞으로 이동할 때 쓰는 rank 생성 (다음 rank보다 작은 값)
    # CHAR_SET의 첫 글자("0")를 하한선으로 두고 get_between을 재사용한다.
    @classmethod
    def get_before(cls, next_rank: str) -> str:
        return cls.get_between(cls.CHAR_SET[0], next_rank)
